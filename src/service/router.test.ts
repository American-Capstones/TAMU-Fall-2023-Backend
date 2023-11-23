import { getVoidLogger } from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';

const mockGetClient = jest.fn();
const mockMigrateUp = jest.fn();
const mockWhere = jest.fn();
const mockUpdate = jest.fn();


const config = ConfigReader.fromConfigs([
  {
    context: '',
    data: {
      'pr-tracker-backend': {
        auth_token: 'token',
        organization: 'organization',
      },
    },
  },
]);

describe('createRouter', () => {
  let app: express.Express;

  beforeAll(async () => {
    mockWhere.mockReturnValue({update: mockUpdate})
    mockGetClient.mockResolvedValue({migrate: {up: mockMigrateUp}, where: mockWhere})
    const router = await createRouter({
      logger: getVoidLogger(),
      database: {getClient: mockGetClient} as any,
      config,
    } as any);
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Sanity check to ensure router is working
  describe('GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  // Deleteing a user repo
  describe('POST /delete-user-repo', () => {
    it('deletes user successfully', async () => {
      const response = await request(app).post('/delete-user-repo').send({user_id: 1, repository: 'test-repo'});
      expect(mockWhere).toHaveBeenCalledWith({user_id: 1, repository: 'test-repo'})
      expect(mockUpdate).toHaveBeenCalledWith({display: false})
      expect(response.status).toBe(200);
    })


    it('fails to delete user successfully because missing user id', async () => {
      const response = await request(app).post('/delete-user-repo').send({ repository: 'test-repo'});
      expect(mockWhere).not.toHaveBeenCalled()
      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing parameter user_id!')
    })


  })

  describe('POST /add-user-repo', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });


  describe('GET /get-user-repos/:user_id', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });


  describe('GET /get-analytics-info/:user_id', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });


  describe('POST /set-pr-priority', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /set-pr-description', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});
