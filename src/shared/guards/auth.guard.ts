import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verify, VerifyOptions } from 'jsonwebtoken';

import config from '~/config';
import { errorCodes } from '~/error.commands';
import { LoggerService } from '~/logger';
import { isPublicSymbol } from '~/shared/decorators/public';

const sessionSignature = config.app.sessionSignature;
const artifactOfAndre = config.app.artifactKey;

interface requestWithHeaders {
  headers: {
    authorization: string | undefined;
  };
}
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new LoggerService();
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    this.logger.log('AuthGuard: Checking authentication');
    const handler = context.getHandler();
    const controller = context.getClass();

    const isPublic = this.reflector.getAllAndOverride<boolean>(isPublicSymbol, [controller, handler]);
    if (isPublic) {
      this.logger.log('AuthGuard: Public route, skipping authentication');
      return true;
    }

    try {
      const request: requestWithHeaders = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;

      const parts = authHeader?.split(' ') ?? [];
      const tokenType = parts[0];
      const token = parts[1];

      if (tokenType !== 'Bearer' || !token) {
        this.logger.warn('AuthGuard: Invalid token, denying access');
        throw new BadRequestException('Invalid token format');
      }

      const decodedToken = decodeURIComponent(token);
      const verifyOptions: VerifyOptions = {
        algorithms: ['HS256'],
        ignoreExpiration: false,
      };
      const result = verify(decodedToken, sessionSignature, verifyOptions) as { artifact: string };

      if (result?.artifact !== artifactOfAndre) {
        this.logger.warn('AuthGuard: Invalid artifact, denying access');
        throw new BadRequestException('Invalid artifact');
      }

      this.logger.log('AuthGuard: Authenticated successfully, can proceed');
      return true;
    } catch (error) {
      this.logger.error('AuthGuard: Error during authentication', (error as Error).message, 'AuthGuard');
      throw new BadRequestException(errorCodes.MISSING_PORTAL_ACCESS.errorcode);
    }
  }
}
