import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import { PluginDatabaseManager } from '@backstage/backend-common';
import { resolvePackagePath } from '@backstage/backend-common';
import { Knex} from 'knex'
import { Octokit } from 'octokit'
import { getPRData } from './pull_request_query';

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


  const octokit = new Octokit({
    auth: authToken
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

    // add to db
    await databaseClient(userRepositoriesTable).insert(
      {'user_id': user_id, 
      'repository': repository}
    );
    response.status(200).send();

  });

  router.get('/get-user-repos/:user_id', async (request, response) => {
    
    const { user_id } = request.params;

    if (!user_id) {
      response.status(400).send('Missing user id');
    }

    const repos = await databaseClient(userRepositoriesTable).where({
      'user_id': user_id
    }).select('repository');
    
    let out = []
    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i].repository;
      const data = await getPRData(octokit, {'owner': organization, 'repo': repo});
      out.push({'repository': repo, 'data': data.repository.pullRequests.nodes});
    }

    response.send(JSON.stringify(out));


  })

  
  router.use(errorHandler());
  return router;
}
