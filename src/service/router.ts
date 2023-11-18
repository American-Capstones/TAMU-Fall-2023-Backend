import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import { PluginDatabaseManager, resolvePackagePath } from '@backstage/backend-common';
import { Knex } from 'knex'
import { UserRepository, getReposData, GraphqlInput, validRepo } from './pull_request_query';
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
  await applyDatabaseMigrations(databaseClient as unknown as Knex);
  const userRepositoriesTable = 'user_repositories';

  const authToken: string = config.getString('pr-tracker-backend.auth_token');
  const organization: string = config.getString('pr-tracker-backend.organization'); // owner of the repository
  const graphqlInput: GraphqlInput = {
    owner: organization, 
    repository: ''
  };

  const authGraphql = graphql.defaults({
    headers: {
      authorization: authToken,
    },
  });

  const router = Router();
  router.use(express.json());

  router.post('/add-user-repo', async (request, response) => {
    const newUserRepo: UserRepository = request.body; 

    if (!newUserRepo.user_id) {
      response.status(400).send('Missing parameter user_id!');
      return;
    }
    if (!newUserRepo.repository) {
      response.status(400).send('Missing parameter repository!');
      return;
    }

    const isValidRepo = await validRepo(logger, authGraphql, {...graphqlInput, repository: newUserRepo.repository}); 
    if (!(isValidRepo)) {
      response.status(400).send('Repository is either not accessible or archived');
      return; 
    }
    try {
      // add to db, ignore duplicates
      await databaseClient<UserRepository>(userRepositoriesTable)
      .insert(newUserRepo)
      .onConflict().ignore();
    }

    catch(error: any) {
      logger.error(`Failed to add ${newUserRepo.user_id} and ${newUserRepo.repository} to database, error: ${error}`);
      response.status(500).send();
    }
    
    response.status(200).send();

  });

  router.get('/get-user-repos/:user_id', async (request, response) => {
    
    const { user_id } = request.params;

    try {
      const repos = await databaseClient<UserRepository>(userRepositoriesTable).where({
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
