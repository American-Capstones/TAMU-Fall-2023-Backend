
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