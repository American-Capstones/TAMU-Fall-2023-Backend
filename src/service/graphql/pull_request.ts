/*
TODO: Supported Analytics:
 * average time to merge
 * average time to first review
 * average PR size
 * top reviewer
 * top pull request contributor
 * % open/closed pull requests

 This piggy backs off of the GET_REPO_DATA and will store things in the postgres table 
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
        additions
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