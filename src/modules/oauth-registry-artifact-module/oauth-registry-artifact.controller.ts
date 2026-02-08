import { readFileSync } from 'node:fs';
import join from 'node:path';

import { BadRequestException, Controller, Get, Header, InternalServerErrorException, Param, Query } from '@nestjs/common';
import { sign, verify, VerifyOptions } from 'jsonwebtoken';

import config from '~/config';
import { errorCodes } from '~/error.commands';
import { LoggerService } from '~/logger';
import { Public } from '~/shared/decorators/public';

import { OauthRegistryService } from './oauth-registry-artifact.service';

const viewsPath = join.join(process.cwd(), 'view');
const successHtml = readFileSync(join.join(viewsPath, 'registry-success.html'), 'utf8');
const failedHtmlTemplate = readFileSync(join.join(viewsPath, 'process-failed.html'), 'utf8');

const getFailedHtml = (errorMessage: string): string => {
  return failedHtmlTemplate.replace('{{ERROR_MESSAGE}}', errorMessage);
};

const sessionSignature = config.app.sessionSignature;
const gateSignature = config.app.gateSignature;

const artifactOfAndre = config.app.artifactKey;
class initialAccessResponse {
  portalToken!: string;
  expiresIn!: number;
}

@Controller('auth')
export class OauthRegistryController {
  private logger;

  constructor(private readonly oauthRegistryService: OauthRegistryService) {
    this.logger = new LoggerService();
  }
  //✅ FUNCIONA PERFECTO
  @Public()
  @Get('request-access')
  requestAccessToConsole(@Query('gateToken') gateToken: string): initialAccessResponse {
    try {
      // verify gate token
      const decodedToken = decodeURIComponent(gateToken);
      const verifyOptions: VerifyOptions = {
        algorithms: ['HS256'],
        ignoreExpiration: true,
      };
      const result = verify(decodedToken, gateSignature, verifyOptions) as { artifact: string };

      if (!result?.artifact || result.artifact !== artifactOfAndre) throw new BadRequestException(errorCodes.MISSING_GATE_TOKEN.errorcode);

      // new portal token
      const payload = { artifact: artifactOfAndre };

      const token = sign(payload, sessionSignature, { algorithm: 'HS256', expiresIn: '5m' });
      const response: initialAccessResponse = { portalToken: encodeURIComponent(token), expiresIn: 300 };

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw new InternalServerErrorException(errorCodes.INTERNAL_SERVER_ERROR.errorcode);
    }
  }

  //✅ FUNCIONA PERFECTO
  @Get('email-window/:email')
  getEmailWindow(@Param('email') email: string): { url: string } {
    try {
      const url = this.oauthRegistryService.requestMicrosoftOAuth(email);
      return { url };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw error;
    }
  }
  //✅ FUNCIONA PERFECTO
  @Public()
  @Get('email-registry-account')
  @Header('Content-Type', 'text/html')
  async approveEmailAccount(@Query('code') code: string, @Query('state') state: string): Promise<string> {
    try {
      await this.oauthRegistryService.approveMicrosoftOauth(code, state);
      return successHtml;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      return getFailedHtml(errorMessage);
    }
  }
}
