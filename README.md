# tamu-fall-2023-backend

Welcome to the tamu-fall-2023-backend backend plugin!

## Getting started

This Backstage plugin was created for the 2023 American Airlines sponsored Texas A&M capstone. This repository holds the backend plugin.

After the inital cloning and setup, the backend plugin requires another set of steps to fully integrate it into the Backstage app.

1. Clone this repository into your backstage root/plugins folder. You'll be able to access it by running `yarn start-backend` in the root directory.


### Integration into the Backstage app

> In the following steps, 'root' will always refer to the root directory of the Backstage app

1. From the backstage root directory, run: ```yarn add --cwd packages/backend pg``` 
2. Add your PostgreSQL configuration in the root directory of your Backstage app with the following code:
```
backend:
  database:
    client: pg
    connection:
      host: ${POSTGRES_HOST}
      port: ${POSTGRES_PORT}
      user: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}
```
3. Navigate to the 'root/packages/backend/package.json' file, add the following code to the list of dependencies:
```json 
"@internal/pr-tracker-backend": "^0.1.0",
```
4. Within the 'root/packages/backend/src/plugins' folder, create the file pr-tracker-backend.ts, add the code below to the newly created file:
 ```typescript
import { createRouter } from '@internal/pr-tracker-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  // Here is where you will add all of the required initialization code that
  // your backend plugin needs to be able to start!

  return await createRouter({
    logger: env.logger,
    config: env.config, 
    database: env.database,
  });
}
 ```
5. Navigate to the 'root/packages/backend/src/index.ts' file, add the following three lines to the following areas:
 ``` typescript
 // Add this code below the imports at the top of the file
 import pr_tracker_backend from './plugins/pr-tracker-backend';

 ```
 ``` typescript
 // Add this line below the const useHotMemoize lines within the main function
 const prTrackerBackendEnv = useHotMemoize(module, () => createEnv('pr-tracker-backend'));
 ```
 ``` typescript
 // Add this line below the apiRouter.use() lines within the main function
 apiRouter.use('/pr-tracker-backend', await pr_tracker_backend(prTrackerBackendEnv));
 ```
6. Navigate back to the 'root/app-config.yaml' file, add the following code to them bottom of the file:
 ```yaml
 // Note: we will pass the specific oauth token if needed to AA directly
 pr-tracker-backend:
  auth_token: "${GITHUB_OAUTH_AA_CAP_SECRET}"
  organization: "CSCE-482-AA-FALL23"
 ```
7. Within the 'root/app-config.yaml' file, navigate to the auth section, replace the 'clientId' and 'clientSecret' with your orgs relevant tokens.
8. Run 'yarn install' from within the plugin directory 'root/plugins/TAMU0Fall-2023-Backend'

  The plugin should now be ready for use!