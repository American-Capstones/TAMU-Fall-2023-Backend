/**
 * Defines GraphQL queries sent to the Github GraphQL api to retrieve information
 * This information include information about pull requests, users, repositories, and teams
 */

// for dashboard only which has can have a limited number of pull requests that change frequently so we don't paginate 
/**
 * A GraphQL query used to fetch pull requests for a given repository (limited to thirty pull requests, 5 labels per pull request, 5 reviews per pull request, and 5 comments per review)
 * Useful for getting general information about a repository's pull requests and displaying more recent pull request to a user
 * Also useful for populating the PostgreSQL database with pull request information for a given repository
 */
export const GET_REPO_DATA = `
query getRepoName($organization: String!, $repository: String!) {
  repository(owner: $organization, name: $repository) {
    pullRequests (last:30){
      nodes {
        labels (first:5){
          nodes {
            color
            name
          }
        }
        id
        number
        title
        state
        body
        url
        createdAt
        updatedAt
        author {
          login
        }
        reviews(last:5) {
          nodes {
            author {
              login
            }
            body
            state
            createdAt
            updatedAt
            comments(last: 5) {
              nodes {
                author {
                  login
                }
                body
                createdAt
                updatedAt
              }
            }
          }
        }
      }
    }
  }
} `

/**
 * A GraphQL query used to check if a repository has been archived
 */
export const IS_ARCHIVED_REPO = `
query isArchived($organization: String!, $repository: String!) {
  repository(owner: $organization, name: $repository) {
    isArchived
	}	
}`

/**
 * A GraphQL query used to fetch a list of repositories for all teams that a user is a part of
 * Useful for generating analytics based on teams
 */
export const GET_TEAM_REPOS = `
query getTeams($organization: String!, $user_id: String!){
  organization(login: $organization) {
    teams(last: 10, userLogins: [$user_id]) {
      nodes{
        name
        repositories {
          nodes {
            name
          }
        }
      }
    }
  }
} 
`

// for analytics where we only look at merged prs that don't change so we can paginate and fetch larger numbers of reviews etc. 
// not starting from the beginning because of rate limits with large repos. 
/**
 * A GraphQL query used to update the analytics for a given repository by fetching merged pull requests and their data
 * Used for the analytics dashboard and to update the database with new information about repository's pull requests through pagination
 */
export const UPDATE_REPOSITORY_ANALYTICS = `
query updateRepositoryAnalytics($organization: String!, $repository: String!, $cursor: String){
  repository(owner: $organization, name: $repository) {
    pullRequests(orderBy:{field:UPDATED_AT, direction:ASC}, states:MERGED, first:100, after:$cursor) {
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
      nodes { 
        createdAt
        mergedAt
        additions
        deletions
        author {
          login
        }
        reviews(last:20) {
          nodes {
            author{
              login
            }
            state
            createdAt
            comments(last: 20) {
              nodes {
                author {
                  login
                }
                createdAt
              }
            }
          }
        }

      }
    }
  }
}
`

/**
 * A GraphQL query used to initliaze repository analytics by fetching merged pull requests and their data
 * Similar to UPDATE_REPOSITORY_ANALYTICS, however it is used for the initializing analytics data
 */
export const INIT_REPOSITORY_ANALYTICS = `
query updateRepositoryAnalytics($organization: String!, $repository: String!, $cursor: String){
  repository(owner: $organization, name: $repository) {
    pullRequests(orderBy:{field:UPDATED_AT, direction:ASC}, states:MERGED, last:100, before:$cursor) {
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
      nodes { 
        createdAt
        mergedAt
        additions
        deletions
        author {
          login
        }
        reviews(last:20) {
          nodes {
            author{
              login
            }
            state
            createdAt
            comments(last: 20) {
              nodes {
                author {
                  login
                }
                createdAt
              }
            }
          }
        }

      }
    }
  }
}
`
