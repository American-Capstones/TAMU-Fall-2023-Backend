/**
 * Defines interfaces used for database table structure
 * These interfaces include storing information about pull requests, repositories, users, and analytics
 */

/**
 * Specifies the table name 'pull_requests' for the database
 */
export const pullRequestTable = 'pull_requests';

/**
 * Specifies the table name 'user_repositories' for the database
 */
export const userRepositoriesTable = 'user_repositories';

/**
 * Specifies the table name 'repository_cursors' for the database
 */
export const repositoryCursorsTable = 'repository_cursors';

/**
 * Specifies the table name 'repository_analytics' for the database
 */
export const repositoryAnalyticsTable = 'repository_analytics';

/**
 * Specifies the table name 'user_analytics' for the database
 */
export const userAnalyticsTable = 'user_analytics';

/**
 * Represents the entry into the pull_requests table in the database
 */
export interface PullRequestEntry {
  pull_request_id: string;
  priority: string;
  description: string;
  description_updated_by: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents the entry into the user_repositories table in the database
 */
export interface UserRepositoryEntry {
  user_id: string;
  repository: string;
  display: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Represents the entry into the repository_cursors table in the database
 * This assists with pagination and determining what need repositories need to be added to the repository
 */
export interface repositoryCursorsEntry {
  repository: string;
  cursor: string;
  created_at: string;
  updated_at: string;
}

/**
 * Represents the entry into the repository_analytics table in the database
 */
export interface repositoryAnalyticsEntry {
  repository: string;
  year: number;
  month: number;
  total_pull_requests_merged: number;
  total_cycle_time: number;
  total_first_review_time: number;
  created_at: string;
  updated_at: string;
}

/**
 * Represents the entry into the user_analytics table in the database
 */
export interface userAnalyticsEntry {
  repository: string;
  user_id: string;
  year: number;
  month: number;
  additions: number;
  deletions: number;
  pull_requests_merged: number;
  pull_requests_reviews: number;
  pull_requests_comments: number;
  created_at: string;
  updated_at: string;
}
