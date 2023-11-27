/**
 * Defines functions to start a standalone server for the Backend plugin
 * This server includes configurations for routing and logging
 */

import { createServiceBuilder } from '@backstage/backend-common';
import { Server } from 'http';
import { Logger } from 'winston';
import { createRouter } from './router';

/**
   * Configuration options for the standalone server
   * @property port - The port in which the server listens
   * @property enableCors - A boolean indicating whether CORS (cross-origin resource sharing) should be enabled
   * @property logger - The logger instance for logging
   */
export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
}

/**
   * Starts a standalone server based on the provided Server Options
   * @param options - Configuration options for the standalone server based on the ServerOptions interface
   * @returns A Promise resolving to a HTTP Server instance
   */
export async function startStandaloneServer(options: ServerOptions): Promise<Server> {
  const logger = options.logger.child({
    service: 'tamu-fall-2023-backend',
  });
  logger.debug('Starting application server...');
  const router = await createRouter({
    logger,
  });

  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/tamu-fall-2023-backend', router);
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return await service.start().catch((err) => {
    logger.error(err);
    process.exit(1);
  });
}

module.hot?.accept();
