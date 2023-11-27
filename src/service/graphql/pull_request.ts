// for dashboard only which has can have a limited number of pull requests that change frequently so we don't paginate 
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

export const IS_ARCHIVED_REPO = `
query isArchived($organization: String!, $repository: String!) {
  repository(owner: $organization, name: $repository) {
    isArchived
	}	
}`

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
