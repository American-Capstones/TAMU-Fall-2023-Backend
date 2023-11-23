import { graphql, GraphqlResponseError } from '@octokit/graphql';
import { GET_REPO_DATA, IS_ARCHIVED_REPO, GET_TEAM_REPOS } from './graphql/pull_request';
import { RequestParameters } from '@octokit/types'
import { Logger } from 'winston';
import { UserRepositoryEntry, pullRequestTable, PullRequestEntry } from './database_types';
import { Knex } from 'knex';

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
    additions: number;
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

interface AnalyticsData {
    averageTimeToMerge: number;
    averageTimeToFirstReview: number;
    averagePRSize: number;
    top_reviewers: string[]; // list holding all people who have reviewed pull requests
    top_pr_contributors: string[]; // list holding all author's of pull requests
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

function dateDifferenceInDays(date1: string, date2: string): number {
    const oneDay = 24*60*60*1000; // Number of milliseconds in a day

    const parsedDate1 = new Date(date1.slice(0,date1.indexOf('T')));
    const parsedDate2 = new Date(date2.slice(0,date2.indexOf('T')));

    // Calculate difference in MS between the dates (getTime() gives the MS since epoch for the date)
    const differenceInMS = Math.abs(parsedDate1.getTime() - parsedDate2.getTime());

    // Convert to Days
    const differenceInDays = Math.round(differenceInMS / oneDay);

    return differenceInDays;
}

// Function that Generates the Analytics Data
export async function getAnalyticsData(databaseClient: Knex, logger: Logger, authGraphql: typeof graphql, repos: Pick<UserRepositoryEntry, 'repository'>[], graphqlInput: GetReposDataInput): Promise<string> {
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

    // Now that I have collected all the data, if out is not empty, loop through all repos and calculate the analytics
    console.log('Calculating Analytics...')

    interface AuthorDictionary {
        [key: string]: number;
    }
    
    let analytics: AnalyticsData = {
        averageTimeToMerge: 0,
        averageTimeToFirstReview: 0,
        averagePRSize: 0,
        top_reviewers: [''], // list holding all people who have reviewed pull requests
        top_pr_contributors: ['']
    }

    let mergedPRs = 0
    let totalTimeToMerge = 0
    let reviewedPRs = 0
    let totalTimeToFirstReview = 0
    let totalPRs = 0
    let totalPRSize = 0
    let reviewers: AuthorDictionary = {}
    let prContributors: AuthorDictionary = {}

    // Loop through all repositories
    for (let i = 0; i < out.length; i++) {
        // Get all pull requests for a single repository
        const repo_pull_requests: PullRequest[] = out[i].data;

        // Loop through all pull requests for the single repository
        for (const pr of repo_pull_requests) {
            // If the pull request has been merged, calculate the total time taken to merge
            if (pr.state == 'MERGED') {
                // Increment the total count of merged pull requests
                mergedPRs++;
                totalTimeToMerge += dateDifferenceInDays(pr.updatedAt, pr.createdAt);
            }

            // If the pull request has been reviewed, calculate the total time taken to review
            if (pr.reviews.nodes.length > 0) {
                // Increment the total count of reviewed pull requests
                reviewedPRs++;
                totalTimeToFirstReview += dateDifferenceInDays(pr.createdAt, pr.reviews.nodes[0].createdAt);
            }

            // Sum up the size of the pull request
            totalPRs++
            totalPRSize += pr.additions;

            // Add the author of the pull request to a dictionary holding all authors and their amount of contributions
            const pr_author: string = pr.author.login
            if (pr_author in prContributors) {
                prContributors[pr_author] += prContributors[pr_author];
            }
            else {
                prContributors[pr_author] = 1;
            }

            // Get all reviews for a single pull request
            const reviews: Review[] = pr.reviews.nodes;
            
            // Loop through all reviews and add all authors to the dictionary, or increment their amount of reviews
            for (const review of reviews) {
                const review_author: string = review.author.login;

                if (review_author in reviewers) {
                    prContributors[review_author] += reviewers[pr_author];
                }
                else {
                    reviewers[review_author] = 1;
                }
            }
        }
    }

    analytics.averageTimeToFirstReview = totalTimeToFirstReview / reviewedPRs
    analytics.averageTimeToMerge = totalTimeToMerge / mergedPRs
    analytics.averagePRSize = totalPRSize / totalPRs

    let sortedArray: any[] = Object.keys(prContributors).map(key => ({key, value: prContributors[key]}));
    sortedArray.sort((a,b) => b.value - a.value)
    analytics.top_pr_contributors = sortedArray
    
    let sortedArray2: any[] = Object.keys(reviewers).map(key => ({key, value: reviewers[key]}));
    sortedArray2.sort((a,b) => b.value - a.value)
    analytics.top_reviewers = sortedArray

    console.log(out)
    console.log(analytics)
    

    return JSON.stringify(analytics);
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

async function getPRData(databaseClient: Knex, logger: Logger, authGraphql: typeof graphql, inputJson: GetPRDataInput): Promise<PullRequestsData> {
    
    logger.info(`Getting data for repository ${inputJson.repo}`)
    const response = await authGraphql<PullRequestsData>(GET_REPO_DATA, inputJson);
    // change the PR state 'OPEN' to 'IN_PROGRESS' once we have reviews, comments, or approvals
    // set state duration to the number of days it has been in the current state
    const pullRequests = response.repository.pullRequests.nodes; 
    for (const pullRequest of pullRequests) {

        // set pr priority and description

        try {
            const prProps = await databaseClient<PullRequestEntry>(pullRequestTable)
            .where({
                pull_request_id: pullRequest.id
            }).first();

            if (prProps) {
                pullRequest.priority = prProps.priority;
                pullRequest.description = prProps.description; 
            }
            else {
                pullRequest.priority = 'None';
                pullRequest.description = '';
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
export async function validRepo(logger: Logger, authGraphql: typeof graphql, inputJson: ValidRepoInput): Promise<boolean> {

      try {
        const response = await authGraphql<RepoCheck>(IS_ARCHIVED_REPO, inputJson);
        return !(response.repository.isArchived); 
      }

      catch(error) {
        // unable to access repo
        if (error instanceof GraphqlResponseError) {
            return false; 
        }

        logger.error(`Unknown error when validating repo: ${inputJson.repo}, error: ${error}`);
        return true; 
        
      } 
}

export async function getTeamsRepos(logger: Logger, authGraphql: typeof graphql, inputJson: GetTeamsReposInput): Promise<TeamsRepositories> {

    logger.info(`Attempting to retrieve team repositories for user ${inputJson.user_id}`)
    return await authGraphql<TeamsRepositories>(GET_TEAM_REPOS, inputJson);
}