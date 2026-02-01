// eslint-disable-next-line import/no-unused-modules
import '~/setup';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from '~/app.module';
import config from '~/config';
import logger, { LoggerService } from '~/logger';

export const bootstrap = async (): Promise<NestExpressApplication> => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new LoggerService(),
    cors: true,
    rawBody: true,
  });

  app.disable('x-powered-by');

  app.enableShutdownHooks();

  await app.listen(config.app.port);
  logger.debug(`Listening on ${config.app.port} PORT`);

  return app;
};

// eslint-disable-next-line unicorn/prefer-module
if (require.main === module) {
  void bootstrap();
}
