import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { graphql } from '@octokit/graphql';

export interface RouterOptions {
  logger: Logger;
}

export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { logger } = options;

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/pokemon/:pokemonName', async (request, response) => {
    const { pokemonName } = request.params;
    // Note: You should definitely make an interface or type for the result of this query
    // I'm just using `any` for simplicity. Using `any` is typically a bad practice.
    const result = await graphql<any>(
      `
        query pokemon_details {
          species: pokemon_v2_pokemonspecies(where: { name: { _eq: ${pokemonName} } }) {
            name
            base_happiness
            is_legendary
            is_mythical
          }
        }
      `,
      { operationName: 'pokemon_details' },
    );
    response.json(result);
  });

  router.use(errorHandler());
  return router;
}
