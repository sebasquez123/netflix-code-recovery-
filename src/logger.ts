import type { LoggerService as LoggerServiceInterface } from '@nestjs/common';
import type { BaseLogger, Level, LoggerOptions } from 'pino';
import Pino, { destination, stdSerializers } from 'pino';

import config from '~/config';

const optionsAtLocal: LoggerOptions = {
  level: config.log.level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      ignore: 'serviceContext',
      translateTime: 'SYS:HH:MM:ss.l',
    },
  },
  serializers: {
    err: stdSerializers.errWithCause,
    error: stdSerializers.errWithCause,
    exception: stdSerializers.errWithCause,
  },
  redact: {
    paths: ['pid', 'hostname'],
    remove: true,
  },
};

const options = optionsAtLocal;

const stdout = Pino(options);
const stderr = Pino(options, destination(2));

const logger: Pick<BaseLogger, Level> = {
  trace: stdout.trace.bind(stdout),
  debug: stdout.debug.bind(stdout),
  info: stdout.info.bind(stdout),
  warn: stdout.warn.bind(stdout),
  error: config.log.isPrettyFormat ? stdout.error.bind(stdout) : stderr.error.bind(stderr),
  fatal: config.log.isPrettyFormat ? stdout.fatal.bind(stdout) : stderr.fatal.bind(stderr),
};

export default logger;

export class LoggerService implements LoggerServiceInterface {
  error(error: unknown, trace?: string, context?: string) {
    logger.error({ error, trace }, `Error at ${context ?? 'unknown context'}`);
  }

  warn(message: string) {
    logger.warn(message);
  }

  log(message: string) {
    logger.trace(message);
  }

  debug(message: string) {
    logger.debug(message);
  }

  verbose(message: string) {
    logger.trace(message);
  }
}
