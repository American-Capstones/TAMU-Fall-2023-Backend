# tamu-fall-2023-backend

Welcome to the tamu-fall-2023-backend backend plugin!

_This plugin was created through the Backstage CLI_

## Getting started

Your plugin has been added to the example app in this repository, meaning you'll be able to access it by running `yarn
start` in the root directory, and then navigating to [/tamu-fall-2023-backend](http://localhost:3000/tamu-fall-2023-backend).

You can also serve the plugin in isolation by running `yarn start` in the plugin directory.
This method of serving the plugin provides quicker iteration speed and a faster startup and hot reloads.
It is only meant for local development, and the setup for it can be found inside the [/dev](/dev) directory.


Steps:
 * Clone plugin into the plugins folder within the backstage app
 * Go to packages/backend/package.json, add "@internal/pr-tracker-backend": "^0.1.0", to the list of dependencies
 * Go back to backstage root directory, run the command yarn install
 * Within the packages/backend/src/plugins folder create the file pr-tracker-backend.ts
 * Add the code below:
 ```
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
 * Add the following three lines to the _ areas of the packages/backend/src/index.ts file
 ```
 // Add this code below the imports at the top of the file
 import pr_tracker_backend from './plugins/pr-tracker-backend';

 ```
 ```
 // Add this line below the const useHotMemoize lines within the main function
 const prTrackerBackendEnv = useHotMemoize(module, () => createEnv('pr-tracker-backend'));
 ```
 ```
 // Add this line below the apiRouter.use() lines within the main function
 apiRouter.use('/pr-tracker-backend', await pr_tracker_backend(prTrackerBackendEnv));
 ```
 * Go back to the root directory of the backstage app, within the app-config.yaml file add the code below to them bottom of the file
 ```
 // Note: we will pass the specific oauth token if needed to AA directly
 pr-tracker-backend:
  auth_token: "${GITHUB_OAUTH_AA_CAP_SECRET}"
  organization: "CSCE-482-AA-FALL23"
 ```
 * In the app-config.yaml file, within the auth section, replace the clientId and clientSecret with your orgs relevant tokens.
 * Run yarn install from within the plugin directory "plugins/TAMU0Fall-2023-Backend"
 * 





 TODO:
  * Come up with tests for each of the api routes (front-end facing)
  * Feature: add repos automatically according to the teams a user belongs to
  * Pagination repo nodes
  * Hiding feature? vs Delete and refresh 
  * Within team or repo, who made most pull requests or reviews
  * Time to merge
  * Time to first review 
  * PR Size
  