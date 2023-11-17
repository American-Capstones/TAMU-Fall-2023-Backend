export const GET_REPO_DATA = `
query getRepoName($owner: String!, $repository: String!) {
  repository(owner: $owner, name: $repository) {
    pullRequests (last:30){
      nodes {
        labels (first:5){
          nodes {
            color
            name
          }
        }
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
query isArchived($owner: String!, $repository: String!) {
  repository(owner: $owner, name: $repository) {
    isArchived
	}	
}`