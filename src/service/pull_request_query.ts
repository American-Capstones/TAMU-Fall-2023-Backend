import { graphql, GraphqlResponseError } from '@octokit/graphql';
import { GET_REPO_DATA, IS_ARCHIVED_REPO } from './graphql/pull_request';
import { RequestParameters } from '@octokit/types'
import { Logger } from 'winston';

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
    nodes: Label[]; 
    number: number;
    title: string;
    state: string;
    body: string; 
    url: string;
    stateDuration: number; 
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

interface RepoCheck {
    repository: {
        isArchived: boolean; 
    }
}

export interface GraphqlInput extends RequestParameters {
    owner: string; 
    repository: string; 
}

export interface UserRepository {
    user_id: string; 
    repository: string; 
    created_at: string;
    updated_at: string; 
}

// repos type is knex.select return type
export async function getReposData(logger: Logger, authGraphql: typeof graphql, repos: Pick<UserRepository, 'repository'>[], graphqlInput: GraphqlInput): Promise<string> {
    let out = []
    for (const repo of repos) {
        try {
            const data = await getPRData(logger, authGraphql, {...graphqlInput, repository: repo.repository});
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


async function getPRData(logger: Logger, authGraphql: typeof graphql, input_json: GraphqlInput): Promise<PullRequestsData> {
    
    logger.info(`Getting data for repository ${input_json.repo}`)
    const response = await authGraphql<PullRequestsData>(GET_REPO_DATA, input_json);
    // change the PR state 'OPEN' to 'IN_PROGRESS' once we have reviews, comments, or approvals
    // set state duration to the number of days it has been in the current state

    return response;

}

// valid if we can access it and it's not archived 
export async function validRepo(logger: Logger, authGraphql: typeof graphql, input_json: GraphqlInput): Promise<boolean> {

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