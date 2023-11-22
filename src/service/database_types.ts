
export const pullRequestTable = 'pull_requests';
export const userRepositoriesTable = 'user_repositories';

export interface PullRequestEntry {
    pull_request_id: string;
    priority: string;
    description: string; 
    createdAt: string; 
    updatedAt: string;  
}

export interface UserRepositoryEntry {
    user_id: string; 
    repository: string; 
    display: boolean;
    created_at: string;
    updated_at: string; 
}

//Maybe add table for storing analytics information?