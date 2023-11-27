/**
 * Entry point for starting the backend plugin service
 * This script initializes and starts the standalone server
 */

import { getRootLogger } from '@backstage/backend-common';
import yn from 'yn';
import { startStandaloneServer } from './service/standaloneServer';

const port = process.env.PLUGIN_PORT ? Number(process.env.PLUGIN_PORT) : 7007;
const enableCors = yn(process.env.PLUGIN_CORS, { default: false });
const logger = getRootLogger();

/**
 * Starts the standalone server using provided configuration options
 * Logs errors and exits the process if the server fails to start
 */
startStandaloneServer({ port, enableCors, logger }).catch((err) => {
  logger.error(err);
  process.exit(1);
});

/**
 * Handles the SIGINT signal (Ctrl+C) to shut down the server
 * Logs an information message and exist the process with code 0
 */
process.on('SIGINT', () => {
  logger.info('CTRL+C pressed; exiting.');
  process.exit(0);
});
