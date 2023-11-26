
export const pullRequestTable = 'pull_requests';
export const userRepositoriesTable = 'user_repositories';
export const repositoryCursorsTable = 'repository_cursors';
export const repositoryAnalyticsTable = 'repository_analytics';
export const userAnalyticsTable = 'user_analytics';

export interface PullRequestEntry {
    pull_request_id: string;
    priority: string;
    description: string; 
    createdAt: string; 
    updatedAt: string;  
};

export interface UserRepositoryEntry {
    user_id: string; 
    repository: string; 
    display: boolean;
    created_at: string;
    updated_at: string; 
};

export interface repositoryCursorsEntry {
    repository: string; 
    cursor: string;
    created_at: string;
    updated_at: string; 
};

export interface repositoryAnalyticsEntry {
    repository: string; 
    year: number;
    month: number; 
    total_pull_requests_merged: number;
    total_cycle_time: number; 
    total_first_review_time: number; 
    created_at: string;
    updated_at: string; 
};

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