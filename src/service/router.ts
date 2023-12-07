/**
 * Defines route for the Backend plugin
 * These include functions for adding, removing, and retrieving pull request and user data from the Postgres Database and the Github GraphQL api
 */

import { request } from 'supertest';
import { errorHandler, PluginDatabaseManager, resolvePackagePath } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import { Knex } from 'knex';
import { graphql, GraphqlResponseError } from '@octokit/graphql';
import {
  AddUserRepoRequestObject,
  DeleteUserRepoRequestObject,
  GetUserReposRequestObject,
  SetPRPriorityRequestObject,
  SetPRDescriptionRequestObject,
  GetAnalyticsRequestObject,
  GetAnalyticsResponseObject,
} from './api_types';
import {
  TeamsRepositories,
  getReposData,
  getTeamsRepos,
  setLeaderBoardAnalytics,
  setRepositoryAnalytics,
  updateDatabaseRepositoryAnalytics,
  validRepo,
} from './pull_request_query';
import {
  PullRequestEntry,
  UserRepositoryEntry,
  pullRequestTable,
  userRepositoriesTable,
} from './database_types';

export interface RouterOptions {
  logger: Logger;
  config: Config;
  database: PluginDatabaseManager;
}

/**
 * Applies database migrations using Knex
 * @param knex - Knex instance for postgres database
 * @returns A promise that resolves when the migrations have been applied
 */
async function applyDatabaseMigrations(knex: Knex): Promise<void> {
  const migrationsDir = resolvePackagePath('@internal/pr-tracker-backend', 'migrations');

  await knex.migrate.latest({
    directory: migrationsDir,
  });
} //


/**
 * Creates an Express router with endpoints for managing user repositories, pull requests, and analytics data
 * @param options.logger - Logger instance for the router
 * @param options.config - Configuration object for the router
 * @param options.database - PluginDatabaseManager instance for database operations
 * @returns A Promise that resolves to an Express.Router instance
 */
export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { logger, config, database } = options;
  const databaseClient = await database.getClient();
  await applyDatabaseMigrations(databaseClient);

  const authToken: string = config.getString('pr-tracker-backend.auth_token');
  const organization: string = config.getString('pr-tracker-backend.organization'); // owner of the repository

  const authGraphql = graphql.defaults({
    headers: {
      authorization: authToken,
    },
  });

  const router = Router();
  router.use(express.json());

  // router.use('/dashboard', (_, res, nxt) => {
  //   res.locals.logger = logger;
  //   res.locals.databaseClient = databaseClient;
  //   res.locals.authGraphql = authGraphql;
  //   res.locals.organization = organization;
  //   nxt();
  // }, dashboardRoute)

  /**
   * POST Route that handles adding a user repository to the database
   * @param request - The incoming HTTP request
   * @param response - The outgoing HTTP response
   * @returns A response indicating success or an error message
   */
  router.post('/add-user-repo', async (request, response) => {
    const newUserRepo: AddUserRepoRequestObject = request.body;

    if (!newUserRepo.user_id) {
      response.status(400).send('Missing parameter user_id!');
      return;
    }
    if (!newUserRepo.repository) {
      response.status(400).send('Missing parameter repository!');
      return;
    }

    const isValidRepo = await validRepo(logger, authGraphql, {
      organization,
      repository: newUserRepo.repository,
    });
    if (!isValidRepo) {
      response.status(400).send('Repository is either not accessible or archived');
      return;
    }

    try {
      // add to db, ignore duplicates
      // if it exists, make it visible

      await databaseClient<UserRepositoryEntry>(userRepositoriesTable)
        .insert({
          user_id: newUserRepo.user_id,
          repository: newUserRepo.repository,
          display: true,
        })
        .onConflict(['user_id', 'repository'])
        .merge({
          display: true,
        });
    } catch (error: any) {
      logger.error(
        `Failed to add ${newUserRepo.user_id} and ${newUserRepo.repository} to database, error: ${error}`,
      );
      response.status(500).send();
    }

    response.status(200).send();
  });

  /**
   * POST Route that handles deleting a user repository to the database
   * @param request - The incoming HTTP request
   * @param response - The outgoing HTTP response
   * @returns A response indicating success or an error message
   */
  router.post('/delete-user-repo', async (request, response) => {
    const userRepo: DeleteUserRepoRequestObject = request.body;
    if (!userRepo.user_id) {
      response.status(400).send('Missing parameter user_id!');
      return;
    }
    if (!userRepo.repository) {
      response.status(400).send('Missing parameter repository!');
      return;
    }

    logger.info(
      `Attempting to delete ${userRepo.user_id} and ${userRepo.repository} from database`,
    );
    try {
      await databaseClient<UserRepositoryEntry>(userRepositoriesTable)
        .where({
          user_id: userRepo.user_id,
          repository: userRepo.repository,
        })
        .update({
          display: false,
        });
    } catch (error: any) {
      logger.error(
        `Failed to delete ${userRepo.user_id} and ${userRepo.repository} from database, error: ${error}`,
      );
      response.status(500).send();
    }

    response.status(200).send();
  });

  /**
   * GET Route that gets all repositories for a given user and their teams
   * @param request - The incoming HTTP request
   * @param response - The outgoing HTTP response
   * @returns A response indicating success or an error message
   */
  router.get('/get-user-repos/:user_id', async (request, response) => {
    const user: GetUserReposRequestObject = request.params;

    let teamRepos: TeamsRepositories;
    try {
      teamRepos = await getTeamsRepos(logger, authGraphql, { organization, user_id: user.user_id });
    } catch (error: any) {
      logger.error(`Failed to retrieve team repositories for ${user.user_id}, error: ${error}`);
      response.status(500).send();
      return;
    }

    try {
      // first update database with all of the team's latest repos
      const teams = teamRepos.organization.teams.nodes;

      for (const team of teams) {
        const repos = team.repositories.nodes;
        for (const repo of repos) {
          await databaseClient<UserRepositoryEntry>(userRepositoriesTable)
            .insert({
              user_id: user.user_id,
              repository: repo.name,
              display: true,
            })
            .onConflict()
            .ignore(); // do not display repos with display set to false
        }
      }
    } catch (error: any) {
      logger.error(
        `Failed to update team repositories for ${user.user_id} to database, error: ${error}`,
      );
      response.status(500).send();
      return;
    }

    try {
      const repos = await databaseClient<UserRepositoryEntry>(userRepositoriesTable)
        .where({
          user_id: user.user_id,
          display: true,
        })
        .select('repository');

      await getReposData(databaseClient, logger, authGraphql, {
        organization,
        repository: '',
        repos,
      }).then((output) => response.send(output));
    } catch (error: any) {
      logger.error(
        `Failed to retrieve repositories for ${user.user_id} from database, error: ${error}`,
      );
      response.status(500).send();
      return;
    }
  });

  /**
   * POST Route that sets the priority of a pull request in the database
   * @param request - The incoming HTTP request
   * @param response - The outgoing HTTP response
   * @returns A response indicating success or an error message
   */
  router.post('/set-pr-priority', async (request, response) => {
    const pull_request: SetPRPriorityRequestObject = request.body;

    if (!pull_request.pull_request_id) {
      response.status(400).send('Missing parameter pull_request_id!');
      return;
    }

    if (!pull_request.priority) {
      response.status(400).send('Missing parameter priority!');
      return;
    }

    const priority_values = {
      None: true,
      Trivial: true,
      Minor: true,
      Major: true,
      Critical: true,
      Blocker: true,
    };

    if (!(pull_request.priority in priority_values)) {
      response.status(400).send('Invalid parameter priority!');
      return;
    }

    try {
      await databaseClient<PullRequestEntry>(pullRequestTable)
        .insert({
          pull_request_id: pull_request.pull_request_id,
          priority: pull_request.priority,
        })
        .onConflict(['pull_request_id'])
        .merge({
          priority: pull_request.priority,
        });
    } catch (error: any) {
      logger.error(
        `Failed to set priority ${pull_request.priority} for pull request ${pull_request.pull_request_id}, error: ${error}`,
      );
      response.status(500).send();
      return;
    }

    response.status(200).send();
  });

  /**
   * POST Route that sets the description for a pull request in the database
   * @param request - The incoming HTTP request
   * @param response - The outgoing HTTP response
   * @returns A response indicating success or an error message
   */
  router.post('/set-pr-description', async (request, response) => {
    const pull_request: SetPRDescriptionRequestObject = request.body;

    if (!pull_request.pull_request_id) {
      response.status(400).send('Missing parameter pull_request_id!');
      return;
    }

    if (!pull_request.description) {
      response.status(400).send('Missing parameter description!');
      return;
    }

    if (!pull_request.description_updated_by) {
      response.status(400).send('Missing parameter description_updated_by!');
      return;
    }

    try {
      await databaseClient<PullRequestEntry>(pullRequestTable)
        .insert({
          pull_request_id: pull_request.pull_request_id,
          description: pull_request.description,
          description_updated_by: pull_request.description_updated_by,
          priority: 'None',
        })
        .onConflict(['pull_request_id'])
        .merge({
          description: pull_request.description,
          description_updated_by: pull_request.description_updated_by,
        });
    } catch (error: any) {
      logger.error(
        `Failed to set description ${pull_request.description} for pull request ${pull_request.pull_request_id}, error: ${error}`,
      );
      response.status(500).send();
      return;
    }

    response.status(200).send();
  });

  /**
   * GET Route retrieves all analytics based on pull request data in the database
   * @param request - The incoming HTTP request
   * @param response - The outgoing HTTP response
   * @returns A response indicating success or an error message
   */
  router.get('/get-analytics/:user_id', async (request, response) => {
    const user: GetAnalyticsRequestObject = request.params;
    try {
      const repos = await databaseClient<UserRepositoryEntry>(userRepositoriesTable).where({
        user_id: user.user_id,
        display: true,
      });

      // calculate data for repos the user is interested in
      // this could take a while first time when the repos are large
      const curYear = new Date().getFullYear();
      const res: GetAnalyticsResponseObject[] = [];
      for (const repo of repos) {
        await updateDatabaseRepositoryAnalytics(databaseClient, logger, authGraphql, {
          organization,
          repository: repo.repository,
        });
      }
      for (const repo of repos) {
        const repositoryResult: GetAnalyticsResponseObject = 
        {
          cycleTimeData: [],
          firstReviewData: [],
          leaderBoard: [],
          totalPullRequestsMerged: [],
          repositoryName: repo.repository,
        };
        for (let yearDiff = 0; yearDiff < 5; ++yearDiff) {
          // repo analytics
         await setRepositoryAnalytics(databaseClient, repo, curYear-yearDiff, repositoryResult);
          // leaderboard
          await setLeaderBoardAnalytics(databaseClient, repo, curYear-yearDiff, repositoryResult);
        }
        res.push(repositoryResult);
      }
      response.send(JSON.stringify(res));
    }
    catch(error: any) {
      logger.error(`Failed to get analytics for user ${user.user_id}, error: ${error}`);
      response.status(500).send();
    }
  });

  router.use(errorHandler());
  return router;
}
