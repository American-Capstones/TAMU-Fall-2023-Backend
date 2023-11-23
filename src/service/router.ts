import { errorHandler, PluginDatabaseManager, resolvePackagePath } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import { Knex } from 'knex'
import { graphql } from '@octokit/graphql'
import { AddUserRepoRequestObject, DeleteUserRepoRequestObject, GetUserReposRequestObject, SetPRPriorityRequestObject, SetPRDescriptionRequestObject } from './api_types';
import { TeamsRepositories, getReposData, getTeamsRepos, validRepo, getAnalyticsData } from './pull_request_query';
import { PullRequestEntry, UserRepositoryEntry, pullRequestTable, userRepositoriesTable } from './database_types';

export interface RouterOptions {
  logger: Logger;
  config: Config;
  database: PluginDatabaseManager;
}

async function applyDatabaseMigrations(knex: Knex): Promise<void> {
  const migrationsDir = resolvePackagePath(
    '@internal/pr-tracker-backend',
    'migrations'
  );

  await knex.migrate.up({
    directory: migrationsDir,
  });
}

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

    const isValidRepo = await validRepo(logger, authGraphql, {organization, repository: newUserRepo.repository}); 
    if (!(isValidRepo)) {
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

    }

    catch(error: any) {
      logger.error(`Failed to add ${newUserRepo.user_id} and ${newUserRepo.repository} to database, error: ${error}`);
      response.status(500).send();
    }
    
    response.status(200).send();

  });

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

    logger.info(`Attempting to delete ${userRepo.user_id} and ${userRepo.repository} from database`)
    try {
      await databaseClient<UserRepositoryEntry>(userRepositoriesTable)
      .where({
        user_id: userRepo.user_id,
        repository: userRepo.repository,
      })
      .update({
        display: false
      });
    }
    catch(error: any) {
      logger.error(`Failed to delete ${userRepo.user_id} and ${userRepo.repository} from database, error: ${error}`);
      response.status(500).send();
    }

    response.status(200).send();

  });

  router.get('/get-user-repos/:user_id', async (request, response) => {
    
    const user: GetUserReposRequestObject = request.params;

    let teamRepos: TeamsRepositories; 
    try {
      teamRepos = await getTeamsRepos(logger, authGraphql, {organization, user_id: user.user_id});
    }
    catch(error: any) {
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
            display: true
          }).onConflict().ignore(); // do not display repos with display set to false
        }
      }
    }

    catch(error: any) {
      logger.error(`Failed to update team repositories for ${user.user_id} to database, error: ${error}`);
      response.status(500).send();
      return;
    }
    

    try {
      const repos = await databaseClient<UserRepositoryEntry>(userRepositoriesTable)
      .where({
        user_id: user.user_id,
        display: true 
      }).select('repository');
      
      await getReposData(databaseClient, logger, authGraphql, repos, {organization, repository: ''}).then(output => response.send(output));

    }
    catch(error: any) {
      logger.error(`Failed to retrieve repositories for ${user.user_id} from database, error: ${error}`);
      response.status(500).send();
      return;
    }

  });

  // For the Analytics Dashboard
  router.get('/get-analytics-info/:user_id', async (request, response) => {
    
    const user: GetUserReposRequestObject = request.params;

    // Get the repos for all of the user's teams
    let teamRepos: TeamsRepositories; 
    try {
      teamRepos = await getTeamsRepos(logger, authGraphql, {organization, user_id: user.user_id});
    }
    catch(error: any) {
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
            display: true
          }).onConflict().ignore(); // do not display repos with display set to false
        }
      }
    }

    catch(error: any) {
      logger.error(`Failed to update team repositories for ${user.user_id} to database, error: ${error}`);
      response.status(500).send();
      return;
    }
    
    // If not hidden get the pull request data for a particular repository
    try {
      const repos = await databaseClient<UserRepositoryEntry>(userRepositoriesTable)
      .where({
        user_id: user.user_id,
        display: true 
      }).select('repository');
      
      // Get the analytics data
      await getAnalyticsData(databaseClient, logger, authGraphql, repos, {organization, repository: ''})
      .then(analyticsInformation => {
        response.send(analyticsInformation);
      })
    }
    catch(error: any) {
      logger.error(`Failed to retrieve repositories for ${user.user_id} from database, error: ${error}`);
      response.status(500).send();
      return;
    }

  });


  router.post('/set-pr-priority',async (request, response) => {
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
        priority: pull_request.priority
      })
      .onConflict(['pull_request_id'])
      .merge({
        priority: pull_request.priority
      });
    }

    catch(error: any) {
      logger.error(`Failed to set priority ${pull_request.priority} for pull request ${pull_request.pull_request_id}, error: ${error}`);
      response.status(500).send();
      return;
    }

    response.status(200).send();
    
  });

  router.post('/set-pr-description',async (request, response) => {
    const pull_request: SetPRDescriptionRequestObject = request.body;

    if (!pull_request.pull_request_id) {
      response.status(400).send('Missing parameter pull_request_id!');
      return;
    }

    if (!pull_request.description) {
      response.status(400).send('Missing parameter description!');
      return;
    }

    try {
      await databaseClient<PullRequestEntry>(pullRequestTable)
      .insert({
        pull_request_id: pull_request.pull_request_id,
        description: pull_request.description,
        priority: 'None'
      })
      .onConflict(['pull_request_id'])
      .merge({
        description: pull_request.description,
      });
    }

    catch(error: any) {
      logger.error(`Failed to set description ${pull_request.description} for pull request ${pull_request.pull_request_id}, error: ${error}`);
      response.status(500).send();
      return;
    }

    response.status(200).send();
    
  });

  router.use(errorHandler());
  return router;
}
