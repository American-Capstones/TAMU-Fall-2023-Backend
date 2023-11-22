
// add user's auth token? 

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