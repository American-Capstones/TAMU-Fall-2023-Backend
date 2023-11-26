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
    });


    it('fails to delete user successfully because missing user id', async () => {
      const response = await request(app).post('/delete-user-repo').send({ repository: 'test-repo'});
      expect(mockWhere).toHaveBeenCalledWith({ repository: 'test-repo'})
      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing parameter user_id!')
    });

    // Need to detgermine what the response.text should be for these three cases
    // it('fails to add repo to database successfully because missing repository', async () => {
    //   const response = await request(app).post('/delete-user-repo').send({user_id: 1, repository: 'test-repo'});
    //   expect(mockWhere).not.toHaveBeenCalled()
    //   expect(response.status).toBe(400);
    //   expect(response.text).toBe('')
    // })

    // it('fails to add repo to database successfully because user not existing', async () => {
    //   const response = await request(app).post('/delete-user-repo').send({user_id: 1, repository: 'test-repo'});
    //   expect(mockWhere).not.toHaveBeenCalled()
    //   expect(response.status).toBe(400);
    //   expect(response.text).toBe('')
    // })

    // it('fails to add repo to database successfully because repo not existing', async () => {
    //   const response = await request(app).post('/delete-user-repo').send({user_id: 1, repository: 'test-repo'});
    //   expect(mockWhere).not.toHaveBeenCalled()
    //   expect(response.status).toBe(400);
    //   expect(response.text).toBe('')
    // })
  })

  // Add a user repo
  describe('POST /add-user-repo', () => {
    it('adds user repo to database successfully', async () => {
      const response = await request(app).post('/add-user-repo').send({user_id: 1, repository: 'test-repo'});
      
      expect(mockWhere).toHaveBeenCalledWith({user_id: 1, repository: 'test-repo'})
      expect(mockUpdate).toHaveBeenCalledWith({display: false})
      expect(response.status).toBe(200);
    });

    it('fails to add repo to database successfully because missing user id', async () => {
      const response = await request(app).post('/add-user-repo').send({repository: 'test-repo'});
      expect(mockWhere).toHaveBeenCalledWith({repository: 'test-repo'})
      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing parameter user_id!')
    });

    it('fails to add repo to database successfully because missing repository', async () => {
      const response = await request(app).post('/add-user-repo').send({user_id: 1});
      expect(mockWhere).toHaveBeenCalledWith({user_id: 1})
      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing parameter repository!')
    });

    it('fails to add repo to database successfully because user not existing', async () => {
      const response = await request(app).post('/add-user-repo').send({user_id: -1, repository: 'test-repo'});
      expect(mockWhere).toHaveBeenCalledWith({user_id: -1, repository: 'test-repo'})
      expect(response.status).toBe(400);
      expect(response.text).toBe('Repository is either not accessible or archived')
    });

    it('fails to add repo to database successfully because repo not existing', async () => {
      const response = await request(app).post('/add-user-repo').send({user_id: 1, repository: 'does-not-exist-repo'});
      expect(mockWhere).toHaveBeenCalledWith({user_id: 1, repository: 'does-not-exist-repo'})
      expect(response.status).toBe(400);
      expect(response.text).toBe('Repository is either not accessible or archived')
    });
  });


  // Get information on multiple user repos for a user
  describe('GET /get-user-repos/:user_id', () => {
    it('gets user repo information successfully', async () => {
      const response = await request(app).get('/get-user-repos/1');
      
      expect(mockWhere).toHaveBeenCalledWith()
      expect(mockUpdate).toHaveBeenCalledWith({display: false})
      expect(response.status).toBe(200);
    });

    it('fails to get user repo information missing user id', async () => {
      const response = await request(app).get('/get-user-repos/');

      expect(mockWhere).not.toHaveBeenCalled()
      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing parameter user_id!')
    });

    // Need to add code into router.ts to send the proper response text
    // it('fails to get user repo information because invalid user id', async () => {
    //   const response = await request(app).get('/get-user-repos/-1');

    //   expect(mockWhere).not.toHaveBeenCalled()
    //   expect(response.status).toBe(400);
    //   expect(response.text).toBe('Repository is either not accessible or archived')
    // })
  });


  // Gets the analytics information for a given user
  describe('GET /get-analytics-info/:user_id', () => {
    it('gets analytics information successfully', async () => {
      const response = await request(app).get('/get-analytics-info/1');
      
      expect(mockWhere).toHaveBeenCalledWith()
      expect(mockUpdate).toHaveBeenCalledWith({display: false})
      expect(response.status).toBe(200);
    });

    it('fails to get analytics information because missing user id', async () => {
      const response = await request(app).get('/get-analytics-info/');

      expect(mockWhere).not.toHaveBeenCalled()
      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing parameter user_id!')
    });

    // Need to add code into router.ts to send the proper response text
    // it('fails to get analytics information because invalid user id', async () => {
    //   const response = await request(app).get('/get-analytics-info/-1');

    //   expect(mockWhere).not.toHaveBeenCalled()
    //   expect(response.status).toBe(400);
    //   expect(response.text).toBe('Repository is either not accessible or archived')
    // })
  });

// Sets the pull request priority on the dashboard page
  describe('POST /set-pr-priority', () => {
    it('sets priority of pull request successfully', async () => {
      const response = await request(app).post('/set-pr-priority').send({user_id: 1, priority: 'Major'});
      
      expect(mockWhere).toHaveBeenCalledWith({user_id: 1, priority: 'Major'})
      expect(mockUpdate).toHaveBeenCalledWith({display: false})
      expect(response.status).toBe(200);
    });

    it('fails to set priority of pull request because missing user_id', async () => {
      const response = await request(app).post('/set-pr-priority').send({priority: 'Major'});
      expect(mockWhere).toHaveBeenCalledWith({priority: 'Major'})
      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing parameter user_id!')
    });

    it('fails to set priority of pull request because missing priority', async () => {
      const response = await request(app).post('/set-pr-priority').send({user_id: 1});
      expect(mockWhere).toHaveBeenCalledWith({user_id: 1})
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid parameter priority!')
    });

    // Need to adjust code in router.ts to send appropriate response statuses 
    // it('fails to set priority of pull request because user not existing', async () => {
    //   const response = await request(app).post('/set-pr-priority').send({user_id: -1, priority: 'Major'});
    //   expect(mockWhere).toHaveBeenCalledWith()
    //   expect(response.status).toBe(400);
    //   expect(response.text).toBe('')
    // });

    // it('fails to set priority of pull request because invalid priority', async () => {
    //   const response = await request(app).post('/set-pr-priority').send({user_id: 1, priority: 'INVALID'});
    //   expect(mockWhere).toHaveBeenCalledWith()
    //   expect(response.status).toBe(400);
    //   expect(response.text).toBe('')
    // });


  });

  // Sets the description for a pull request on the dashboard page
  describe('POST /set-pr-description', () => {
    it('sets pull request description successfully', async () => {
      const response = await request(app).post('/set-pr-description').send({user_id: 1, description: 'pull request description'});
      
      expect(mockWhere).toHaveBeenCalledWith({user_id: 1, description: 'pull request description'})
      expect(mockUpdate).toHaveBeenCalledWith({display: false})
      expect(response.status).toBe(200);
    });

    it('fails to set pull request description successfully because of missing user_id', async () => {
      const response = await request(app).post('/set-pr-description').send({description: 'pull request description'});
      
      expect(mockWhere).toHaveBeenCalledWith({description: 'pull request description'})
      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing parameter user_id!')
    });

    it('fails to set pull request description successfully because missing description', async () => {
      const response = await request(app).post('/set-pr-description').send({user_id: 1});
      
      expect(mockWhere).toHaveBeenCalledWith({user_id: 1})
      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing parameter repository!')
    });

    it('fails to set pull request description successfully because invalid user_id', async () => {
      const response = await request(app).post('/set-pr-description').send({user_id: -1, description: 'pull request description'});
      
      expect(mockWhere).toHaveBeenCalledWith({user_id: -1, description: 'pull request description'})
      expect(response.status).toBe(400);
      expect(response.text).toBe('Repository is either not accessible or archived')
    });
  });
});
