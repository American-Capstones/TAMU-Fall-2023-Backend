/**
 * Defines interfaces for various REST api response objects
 * These include interfaces for getting, storing, and retrieving information on pull request, users, and repositories
 */

import { userAnalyticsEntry } from './database_types';

/**
 * Represents the request object for adding a user repository
 */
export interface AddUserRepoRequestObject {
  user_id: string;
  repository: string;
}

/**
 * Represents the request object for deleting a user repository
 */
export interface DeleteUserRepoRequestObject {
  user_id: string;
  repository: string;
}

/**
 * Represents the request object for getting a user's repositories
 */
export interface GetUserReposRequestObject {
  user_id: string;
}

/**
 * Represents the request object for setting the priority of a pull request in the database
 */
export interface SetPRPriorityRequestObject {
  pull_request_id: string;
  priority: string;
}

/**
 * Represents the request object for setting the description of a pull request in the database
 */
export interface SetPRDescriptionRequestObject {
  pull_request_id: string;
  description: string;
}

/**
 * Represents the request object for getting the analytics information for a given user
 */
export interface GetAnalyticsRequestObject {
  user_id: string;
}

/**
 * Represents the request object for getting analytics information and passing it to the frontend plugin
 */
export interface GetAnalyticsResponseObject {
  cycleTimeData: number[][]; // 13 values - first the year and then monthly cycle time averages
  firstReviewData: number[][]; // 13 values - first the year and then monthly cycle time averages
  totalPullRequestsMerged: number[][]; // 13 values ...
  leaderBoard: {
    year: number;
    data: userAnalyticsEntry[];
  }[];
  repositoryName: string;
}
