import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import { PluginDatabaseManager } from '@backstage/backend-common';
import { resolvePackagePath } from '@backstage/backend-common';
import { Knex } from 'knex'
import { getReposData, graphqlInput, ValidRepo } from './pull_request_query';
import { graphql } from '@octokit/graphql'

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
  const userRepositoriesTable = 'user_repositories';

  const authToken: string = config.getString('pr-tracker-backend.auth_token');
  const organization: string = config.getString('pr-tracker-backend.organization'); // owner of the repository
  const graphqlInput: graphqlInput = {
    owner: organization, 
    repo: ''
  };

  const authGraphql = graphql.defaults({
    headers: {
      authorization: authToken,
    },
  });

  const router = Router();
  router.use(express.json());

  router.post('/add-user-repo', async (request, response) => {
    const user_id: string = request.body.user_id; 
    const repository: string = request.body.repository;     
    
    if (!user_id || !repository) {
      response.status(400).send('Missing parameters for user id and/or repo');
      return;
    }

    graphqlInput.repo = repository;
    const isValidRepo = await ValidRepo(logger, authGraphql, graphqlInput); 
    if (!(isValidRepo)) {
      response.status(400).send('Repository is either not accessible or archived');
      return; 
    }
    try {
      // add to db, ignore duplicates
      await databaseClient(userRepositoriesTable).insert(
        {'user_id': user_id, 
        'repository': repository}
      )
      .onConflict().ignore();
    }

    catch(error: any) {
      logger.error(`Failed to add ${user_id} and ${repository} to database, error: ${error}`);
      response.status(500).send();
    }
    
    response.status(200).send();

  });

  router.get('/get-user-repos/:user_id', async (request, response) => {
    
    const { user_id } = request.params;

    try {
      const repos = await databaseClient(userRepositoriesTable).where({
        'user_id': user_id
      }).select('repository');
      
      await getReposData(logger, authGraphql, repos, graphqlInput).then(output => response.send(output));

    }
    catch(error: any) {
      logger.error(`Failed to retrieve repositories for ${user_id} from database, error: ${error}`);
      response.status(500).send();
    }

  })

  router.use(errorHandler());
  return router;
}
