import 'reflect-metadata';
import logger from '~/logger';

process.env.TZ = 'UTC';

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled Rejection');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Unhandled Exception');
  process.exit(1);
});

process.on('warning', (error) => {
  logger.error({ error }, 'Warning detected');
});

process.on('exit', (code) => {
  if (code === 0) {
    logger.info('Stopped gracefully');
  } else {
    logger.fatal(`Stopped with code: ${code}`);
  }
});
