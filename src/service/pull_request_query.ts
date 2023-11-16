import { Octokit } from 'octokit';
import { GET_REPO_DATA } from './graphql/pull_request';


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

// PullRequest
interface PullRequest {
    number: number;
    title: string;
    state: string;
    body: string; 
    url: string;
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


export async function getPRData(octokit: Octokit, input_json: any): Promise<PullRequestsData> {
    const response: PullRequestsData = await octokit.graphql(GET_REPO_DATA, input_json);
    return response;

}