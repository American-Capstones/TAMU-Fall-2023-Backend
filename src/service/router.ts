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

  router.get('/health2', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });
  router.get('/config/:id', async (request, response) => {
    const { id } = request.params;
    const val = config.getOptionalString(`tamu.${id}`);
    response.json({ status: val });
  });

  router.post('/add-user-repo', async (request, response) => {
    
    const email_id: string = request.body.email_id; 
    const repository: string = request.body.repository; 
    const validateEmail = (email: string) => {
      return String(email)
        .toLowerCase()
        .match(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
    };
    
    
    if (!email_id || !repository || !validateEmail(email_id)) {
      response.status(400).send('Missing or invalid parameters for email and/or repo');
      return;
    }

    // add to db
    await databaseClient(userRepositoriesTable).insert(
      {'email_id': email_id, 
      'repository': repository}
    );
    response.status(200).send();

  });



  router.post('/get-user-repos', async (request, response) => {
    const email_id: string = request.body.email_id; 
    const validateEmail = (email: string) => {
      return String(email)
        .toLowerCase()
        .match(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
    };

    if (!email_id || !validateEmail(email_id)) {
      response.status(400).send('Missing or invalid email id');
    }

    const repos = await databaseClient(userRepositoriesTable).where({
      'email_id': email_id
    }).select('repository');
    
    let out = []
    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i].repository;
      const data = await getPRData(octokit, {'owner': organization, 'repo': repo});
      out.push({'repository': repo, 'data': JSON.stringify(data.repository.pullRequests.nodes)});
    }

    response.send(out);


  })

  
  router.use(errorHandler());
  return router;
}
