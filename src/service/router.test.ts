import { getVoidLogger } from '@backstage/backend-common';
import { graphql } from '@octokit/graphql';
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';

jest.mock('@octokit/graphql');

describe('createRouter', () => {
  let app: express.Express;

  beforeAll(async () => {
    const router = await createRouter({
      logger: getVoidLogger(),
    });
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /pokemon/:pokemonName', () => {
    it('gets pikachu correctly', async () => {
      // Apparently, the package I was using no longer exports `mocked` (jest-test/utils).
      // You should use jest.mocked() instead.
      jest.mocked(graphql).mockResolvedValue({ pokemon: { name: 'pikachu' } });
      const response = await request(app).get('/pokemon/pikachu');
      expect(response.body).toEqual({ pokemon: { name: 'pikachu' } });
      expect(graphql).toHaveBeenCalledWith(expect.stringContaining('_eq: pikachu'), {
        operationName: 'pokemon_details',
      });
    });
  });
});
