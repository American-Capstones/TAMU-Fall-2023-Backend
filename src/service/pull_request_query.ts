import { graphql, GraphqlResponseError } from '@octokit/graphql';
import { GET_REPO_DATA, IS_ARCHIVED_REPO, GET_TEAM_REPOS, UPDATE_REPOSITORY_ANALYTICS, INIT_REPOSITORY_ANALYTICS } from './graphql/pull_request';
import { RequestParameters } from '@octokit/types'
import { Logger } from 'winston';
import { repositoryAnalyticsEntry, repositoryAnalyticsTable, repositoryCursorsEntry, repositoryCursorsTable, userAnalyticsEntry, userAnalyticsTable, UserRepositoryEntry } from './database_types';
import { Knex } from 'knex';
import { pullRequestTable, PullRequestEntry } from './database_types'
import { GetAnalyticsResponseObject } from './api_types';

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
    comments: {
        nodes: Comment[];
    }
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
    additions: number;
    deletions: number;
    priority: string; 
    description: string; 
    description_updated_by: string; 
    stateDuration: number; 
    numApprovals: number; 
    createdAt: string;
    updatedAt: string;
    mergedAt: string; 
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
            pageInfo: {
                hasPreviousPage: boolean;
                hasNextPage: boolean;
                startCursor: string | null; 
                endCursor: string | null; 
              }
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
    repos: Pick<UserRepositoryEntry, 'repository'>[];
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

export interface UpdateDatabaseRepositoryAnalyticsInput extends RequestParameters {
    organization: string; 
    repository: string; 
}

async function calculateAnalytics(inputJson: UpdateDatabaseRepositoryAnalyticsInput, databaseClient: Knex, logger: Logger, data: PullRequestsData) {
    const pullRequests = data.repository.pullRequests.nodes;
    const hourDifference = (t1: Date, t2: Date) => Math.round(Math.abs((t1.getTime()-t2.getTime())/(1000*60*60)));
    
    for (const pullRequest of pullRequests) {
        // update repository analytics
        
        const createdAt = new Date(pullRequest.createdAt);
        const mergedAt = new Date(pullRequest.mergedAt);
        const firstReviewTime = pullRequest.reviews.nodes.length > 0 ? 
        hourDifference(new Date(pullRequest.reviews.nodes[0].createdAt), createdAt) : 0;
        // increment if it already exists
        await databaseClient<repositoryAnalyticsEntry>(repositoryAnalyticsTable)
            .insert({
                repository: inputJson.repository,
                year: mergedAt.getFullYear(),
                month: mergedAt.getMonth()+1,
                total_pull_requests_merged: 1,
                total_cycle_time: hourDifference(mergedAt, createdAt), // hours 
                total_first_review_time: firstReviewTime, // github reviews seem sorted by timestamp
            })
            .onConflict(['repository', 'year', 'month'])
            .merge({
                total_pull_requests_merged: databaseClient.raw('?? + ?', [`${repositoryAnalyticsTable}.total_pull_requests_merged`, 1]),
                total_cycle_time: databaseClient.raw('?? + ?', [`${repositoryAnalyticsTable}.total_cycle_time`, hourDifference(mergedAt, createdAt)]),
                total_first_review_time: databaseClient.raw('?? + ?', [`${repositoryAnalyticsTable}.total_first_review_time`, firstReviewTime])
            });

        
        // update author
        if (pullRequest.author !== undefined) {
            await databaseClient<userAnalyticsEntry>(userAnalyticsTable)
            .insert({
                repository: inputJson.repository,
                user_id: pullRequest.author.login,
                year: mergedAt.getFullYear(),
                month: mergedAt.getMonth()+1,
                additions: pullRequest.additions,
                deletions: pullRequest.deletions,
                pull_requests_merged: 1,
                pull_requests_reviews: 0,
                pull_requests_comments: 0,
            })
            .onConflict(['repository', 'user_id', 'year', 'month'])
            .merge({
                additions: databaseClient.raw('?? + ?', [`${userAnalyticsTable}.additions`, pullRequest.additions]),
                deletions: databaseClient.raw('?? + ?', [`${userAnalyticsTable}.deletions`, pullRequest.deletions]),
                pull_requests_merged: databaseClient.raw('?? + ?', [`${userAnalyticsTable}.pull_requests_merged`, 1]),
            });
        }
        
        // update reviewers and commenters
        for (const review of pullRequest.reviews.nodes) {
            const createdAt = new Date(review.createdAt);
            await databaseClient<userAnalyticsEntry>(userAnalyticsTable)
            .insert({
                repository: inputJson.repository,
                user_id: review.author.login,
                year: createdAt.getFullYear(),
                month: createdAt.getMonth()+1, 
                additions: 0,
                deletions: 0,
                pull_requests_merged: 0,
                pull_requests_reviews: 1,
                pull_requests_comments: 0,
            })
            .onConflict(['repository', 'user_id', 'year', 'month'])
            .merge({
                pull_requests_reviews: databaseClient.raw('??+?', [`${userAnalyticsTable}.pull_requests_reviews`, 1])
            })
            for (const comment of review.comments.nodes) {
                const createdAt = new Date(comment.createdAt);
                await databaseClient<userAnalyticsEntry>(userAnalyticsTable)
                .insert({
                    repository: inputJson.repository,
                    user_id: comment.author.login,
                    year: createdAt.getFullYear(),
                    month: createdAt.getMonth()+1, 
                    additions: 0,
                    deletions: 0,
                    pull_requests_merged: 0,
                    pull_requests_reviews: 1,
                    pull_requests_comments: 0,
                })
                .onConflict(['repository', 'user_id', 'year', 'month'])
                .merge({
                    pull_requests_comments: databaseClient.raw('??+?', [`${userAnalyticsTable}.pull_requests_comments`, 1])
                })
            }
        }

    }
}


export async function updateDatabaseRepositoryAnalytics(databaseClient: Knex, logger: Logger, authGraphql: typeof graphql,
inputJson: UpdateDatabaseRepositoryAnalyticsInput) {

       try {
            // only 1 client should be doing this per repo so it's a serializable transaction
            await databaseClient.transaction(async trx => {

                const repoEntry = await trx<repositoryCursorsEntry>(repositoryCursorsTable)
                                .where({
                                    repository: inputJson.repository
                                }).first();
                
                if (repoEntry === undefined) {
                    logger.info(`Adding new repository cursor ${inputJson.repository}`)
                    await trx<repositoryCursorsEntry>(repositoryCursorsTable)
                    .insert({
                        repository: inputJson.repository,
                    });
                    
                    // load last 1000 pull requests
                    let cursor = null; 
                    for (let i = 0; i < 10; ++i) {
                        const data: PullRequestsData = await authGraphql<PullRequestsData>(INIT_REPOSITORY_ANALYTICS, {...inputJson, cursor});
                        if (i == 0 && data.repository.pullRequests.pageInfo.endCursor) {
                            // update final cursor
                            await trx<repositoryCursorsEntry>(repositoryCursorsTable)
                            .where({
                                repository: inputJson.repository
                            })
                            .update({
                                cursor: data.repository.pullRequests.pageInfo.endCursor
                            });
                        }
                        await calculateAnalytics(inputJson, databaseClient, logger, data);
                        if (data.repository.pullRequests.pageInfo.hasPreviousPage) {
                            cursor = data.repository.pullRequests.pageInfo.startCursor;
                        } 
                        else break;
                    }
                }

                else {
                    const data = await authGraphql<PullRequestsData>(UPDATE_REPOSITORY_ANALYTICS, {...inputJson, cursor: repoEntry.cursor});
                    await calculateAnalytics(inputJson, databaseClient, logger, data);
                    // update cursor
                    if (data.repository.pullRequests.pageInfo.endCursor !== null) {
                        await trx<repositoryCursorsEntry>(repositoryCursorsTable)
                        .where({
                            repository: inputJson.repository
                        })
                        .update({
                            cursor: data.repository.pullRequests.pageInfo.endCursor
                        });
                    };
                }
                
            }, {isolationLevel: 'serializable'});
       }
       catch(error: any) {
            logger.error(`Failed to update repository because of ${error}`);
       }

}


// repos type is knex.select return type
export async function getReposData(databaseClient: Knex, logger: Logger, authGraphql: typeof graphql, 
inputJson: GetReposDataInput): Promise<string> {
    let out = []
    for (const repo of inputJson.repos) {
        try {
            const data = await getPRData(databaseClient, logger, authGraphql, {organization: inputJson.organization, repository: repo.repository});
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

            if (prProps !== undefined) {
                pullRequest.priority = prProps.priority;
                pullRequest.description = prProps.description; 
                pullRequest.description_updated_by = prProps.description_updated_by; 
            }
            else {
                pullRequest.priority = 'None';
                pullRequest.description = '';
                pullRequest.description_updated_by = 'None';
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

export async function setRepositoryAnalytics(databaseClient: Knex, repo: UserRepositoryEntry, year: number, repositoryResult: GetAnalyticsResponseObject) {
    const repoData = await databaseClient<repositoryAnalyticsEntry>(
        repositoryAnalyticsTable,
      ).where({
        repository: repo.repository,
        year,
      });

      const yearCycleTimeData = [year];
      const yearFirstReviewData = [year];
      const yearPRmergedData = [year];
      for (let i = 0; i < 12; ++i) {
        yearCycleTimeData.push(-1);
        yearFirstReviewData.push(-1);
        yearPRmergedData.push(-1);
      }

      for (const entry of repoData) {
        yearCycleTimeData[entry.month] = Number(
          (
            Math.round((entry.total_cycle_time / entry.total_pull_requests_merged) * 100) / 100
          ).toFixed(2),
        );
        yearFirstReviewData[entry.month] = Number(
          (
            Math.round((entry.total_first_review_time / entry.total_pull_requests_merged) * 100) /
            100
          ).toFixed(2),
        );
        yearPRmergedData[entry.month] = entry.total_pull_requests_merged;
      }

      repositoryResult.cycleTimeData.push(yearCycleTimeData);
      repositoryResult.firstReviewData.push(yearFirstReviewData);
      repositoryResult.totalPullRequestsMerged.push(yearPRmergedData);
}

export async function setLeaderBoardAnalytics(databaseClient: Knex, repo: UserRepositoryEntry, year: number, repositoryResult: GetAnalyticsResponseObject) {
    const userData = await databaseClient<userAnalyticsEntry>(userAnalyticsTable).where({
        repository: repo.repository,
        year,
      });

      const curLeaderBoard: {
        year: number;
        data: userAnalyticsEntry[];
      } = { year, data: []}
      for (const entry of userData) {
        curLeaderBoard.data.push(entry);
      }

      // sort leaderboard
      const score = (user: userAnalyticsEntry) => {
        return (
          user.pull_requests_merged +
          0.375 * user.pull_requests_reviews +
          0.15 * user.pull_requests_comments
        );
      };

      curLeaderBoard.data.sort((user1, user2) => score(user2)-score(user1));
      repositoryResult.leaderBoard.push(curLeaderBoard);
}