import { BadRequestException, Controller, Get, InternalServerErrorException, Param, Query } from '@nestjs/common';
import { sign, verify, VerifyOptions } from 'jsonwebtoken';

import config from '~/config';
import { StorageService } from '~/databaseSql/storage.service';
import { errorCodes } from '~/error.commands';
import { LoggerService } from '~/logger';
import { Public } from '~/shared/decorators/public';

import { SheetAzureService } from '../sheet-azure-module/database-interface.service';

import { OauthRegistryService } from './oauth-registry-artifact.service';

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

  constructor(
    private readonly oauthRegistryService: OauthRegistryService,
    private readonly sheetAzureService: SheetAzureService,
    private readonly storageService: StorageService
  ) {
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

      const token = sign(payload, sessionSignature, { algorithm: 'HS256', expiresIn: '60m' });
      const response: initialAccessResponse = { portalToken: encodeURIComponent(token), expiresIn: Date.now() + 3600 * 1000 };

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw new InternalServerErrorException(errorCodes.INTERNAL_SERVER_ERROR.errorcode);
    }
  }

  //✅ FUNCIONA PERFECTO
  @Get('email-window/:email')
  getEmailWindow(@Param('email') email: string): string {
    try {
      return this.oauthRegistryService.requestMicrosoftOAuth(email);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw error;
    }
  }
  //✅ FUNCIONA PERFECTO
  @Public()
  @Get('email-registry-account')
  async approveEmailAccount(@Query('code') code: string, @Query('state') state: string): Promise<void> {
    try {
      return await this.oauthRegistryService.approveMicrosoftOauth(code, state);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw error;
    }
  }
}
