# tamu-fall-2023-backend

Welcome to the tamu-fall-2023-backend backend plugin!

## Getting started

This plugin for Backstage was created for the 2023 American Airlines sponsored Texas A&M capstone. This repository holds the backend plugin.

After the inital cloning and setup, the backend plugin requires another set of steps to fully integrate it into the Backstage app.

1. Clone this repository into your backstage root/plugins folder. You'll be able to access it by running `yarn start-backend` in the root directory.


### Integration into the Backstage app
1. Go to packages/backend/package.json, add `"@internal/pr-tracker-backend": "^0.1.0"`, to the list of dependencies
2. Within the packages/backend/src/plugins folder create the file pr-tracker-backend.ts
3. Add the code below to the newly created file:
 ```typescript
import { createRouter } from '@internal/pr-tracker-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  // Here is where you will add all of the required initialization code that
  // your backend plugin needs to be able to start!

  // The env contains a lot of goodies, but our router currently only
  // needs a logger
  return await createRouter({
    logger: env.logger,
    config: env.config, 
    database: env.database,
  });
}
 ```
4. Add the following three lines to the following areas of the packages/backend/src/index.ts file
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
5. Go back to the root directory of the backstage app, within the app-config.yaml file add the code below to them bottom of the file
 ```yaml
 // Note: we will pass the specific oauth token if needed to AA directly
 pr-tracker-backend:
  auth_token: "${GITHUB_OAUTH_AA_CAP_SECRET}"
  organization: "CSCE-482-AA-FALL23"
 ```
6. In the app-config.yaml file, within the auth section, replace the clientId and clientSecret with your orgs relevant tokens.
7. Run yarn install from within the plugin directory "plugins/TAMU0Fall-2023-Backend"

  