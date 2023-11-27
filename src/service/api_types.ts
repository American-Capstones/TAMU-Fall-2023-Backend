// add user's auth token?

import { userAnalyticsEntry } from './database_types';

export interface AddUserRepoRequestObject {
  user_id: string;
  repository: string;
}

export interface DeleteUserRepoRequestObject {
  user_id: string;
  repository: string;
}

export interface GetUserReposRequestObject {
  user_id: string;
}

export interface SetPRPriorityRequestObject {
  pull_request_id: string;
  priority: string;
}

export interface SetPRDescriptionRequestObject {
  pull_request_id: string;
  description: string;
}

export interface GetAnalyticsRequestObject {
  user_id: string;
}

export interface GetAnalyticsResponseObject {
  cycleTimeData: number[][]; // 13 values - first the year and then monthly cycle time averages
  firstReviewData: number[][]; // 13 values - first the year and then monthly cycle time averages
  totalPullRequestsMerged: number[][]; // 13 values ...
  leaderBoard: {
    [year: number]: {
      [month: number]: userAnalyticsEntry[];
    };
  };
  repositoryName: string;
}
