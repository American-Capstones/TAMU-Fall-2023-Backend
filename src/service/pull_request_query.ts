import { graphql, GraphqlResponseError } from '@octokit/graphql';
import { GET_REPO_DATA, IS_ARCHIVED_REPO, GET_TEAM_REPOS } from './graphql/pull_request';
import { RequestParameters } from '@octokit/types'
import { Logger } from 'winston';
import { UserRepositoryEntry } from './database_types';
import { Knex } from 'knex';
import { pullRequestTable, PullRequestEntry } from './database_types'

interface Comment {
    author: {
        login: string;
    }
    body: string; 
    createdAt: string; 
    updatedAt: string
}


interface Review {
    author: {
        login: string;
    };
    comments: Comment[];
    body: string;
    state: string;
    createdAt: string;
    updatedAt: string; 
}

interface Label {
    color: string; 
    name: string;
}

// PullRequest
interface PullRequest {
    id: string; 
    nodes: Label[]; 
    number: number;
    title: string;
    state: string;
    body: string; 
    url: string;
    priority: string; 
    description: string; 
    stateDuration: number; 
    numApprovals: number; 
    createdAt: string;
    updatedAt: string;
    author: {
        login: string;
    };
    reviews: {
        nodes: Review[];
        
    };
}

// Set the interface for the expected response regarding Pull Requests
interface PullRequestsData {
    repository: {
        pullRequests: {
            nodes: PullRequest[];
        };
    };
}

export interface TeamsRepositories { // several teams
    organization: {
        teams: {
            nodes: TeamRepositories[]; // one team
        }
    }
}

interface TeamRepositories {
    name: string; // team name
    repositories: {
        nodes: {
            name: string; 
        }[]
    }
}

interface RepoCheck {
    repository: {
        isArchived: boolean; 
    }
}

export interface GetReposDataInput extends RequestParameters {
    organization: string; 
    repository: string; 
}

export interface GetPRDataInput extends RequestParameters {
    organization: string; 
    repository: string; 
}

export interface ValidRepoInput extends RequestParameters {
    organization: string; 
    repository: string; 
}

export interface GetTeamsReposInput extends RequestParameters {
    organization: string; 
    user_id: string; 
}

// repos type is knex.select return type
export async function getReposData(databaseClient: Knex, logger: Logger, authGraphql: typeof graphql, repos: Pick<UserRepositoryEntry, 'repository'>[], graphqlInput: GetReposDataInput): Promise<string> {
    let out = []
    for (const repo of repos) {
        try {
            const data = await getPRData(databaseClient, logger, authGraphql, {...graphqlInput, repository: repo.repository});
            out.push({repository: repo.repository, data: data.repository.pullRequests.nodes});
        }

        catch(error: any) {
            logger.error(`Failed to get PR data for repository ${repo.repository}, error: ${error}`);
            // might happen if repo gets deleted? 
            // continue trying to get other repos
        }
    }
    return JSON.stringify(out);
}


async function getPRData(databaseClient: Knex, logger: Logger, authGraphql: typeof graphql, input_json: GetPRDataInput): Promise<PullRequestsData> {
    
    logger.info(`Getting data for repository ${input_json.repo}`)
    const response = await authGraphql<PullRequestsData>(GET_REPO_DATA, input_json);
    // change the PR state 'OPEN' to 'IN_PROGRESS' once we have reviews, comments, or approvals
    // set state duration to the number of days it has been in the current state
    let pullRequests = response.repository.pullRequests.nodes; 
    for (let pullRequest of pullRequests) {


        // set pr priority and description

        try {
            const pr_props = await databaseClient<PullRequestEntry>(pullRequestTable)
            .where({
                pull_request_id: pullRequest.id
            }).first();

            if (pr_props !== undefined) {
                pullRequest.priority = pr_props.priority;
                pullRequest.description = pr_props.description; 
            }
        }

        catch(error: any) {
            logger.error(`Failed to retrieve pull request properties for pull request: ${pullRequest.title}, error: ${error}`);
        }


        const currentTime = new Date(); 
        if (pullRequest.state === 'OPEN' && pullRequest.reviews.nodes.length === 0) {
            const createdAt = new Date(pullRequest.createdAt); 
            pullRequest.stateDuration = Math.round((currentTime.getTime() - createdAt.getTime()) / (1000*60*60*24));
        }
        else if (pullRequest.state === 'OPEN') {
            pullRequest.state = 'IN_PROGRESS';
             const inProgressSince = Math.min(...pullRequest.reviews.nodes.map(node => new Date(node.createdAt).getTime()));
             pullRequest.stateDuration = Math.round((currentTime.getTime() - inProgressSince) / (1000*60*60*24));
        }    
        else {
            const updatedAt = new Date(pullRequest.updatedAt); 
            pullRequest.stateDuration = Math.round((currentTime.getTime() - updatedAt.getTime()) / (1000*60*60*24));
        }
        pullRequest.numApprovals = pullRequest.reviews.nodes.filter(node => node.state === 'APPROVED').length; 
    }
    return response;

}

// valid if we can access it and it's not archived 
export async function validRepo(logger: Logger, authGraphql: typeof graphql, input_json: ValidRepoInput): Promise<boolean> {

      try {
        const response = await authGraphql<RepoCheck>(IS_ARCHIVED_REPO, input_json);
        return !(response.repository.isArchived); 
      }

      catch(error) {
        // unable to access repo
        if (error instanceof GraphqlResponseError) {
            return false; 
        }

        logger.error(`Unknown error when validating repo: ${input_json.repo}, error: ${error}`);
        return true; 
        
      } 
}

export async function getTeamsRepos(logger: Logger, authGraphql: typeof graphql, input_json: GetTeamsReposInput): Promise<TeamsRepositories> {

    logger.info(`Attempting to retrieve team repositories for user ${input_json.user_id}`)
    return await authGraphql<TeamsRepositories>(GET_TEAM_REPOS, input_json);
}