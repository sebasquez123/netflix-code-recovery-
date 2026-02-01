import { BadRequestException, Controller, Get, InternalServerErrorException, Param, Query } from '@nestjs/common';
import { sign, verify, VerifyOptions } from 'jsonwebtoken';

import config from '~/config';
import { StorageService } from '~/databaseSql/storage.service';
import { errorCodes } from '~/error.commands';
import { LoggerService } from '~/logger';
import { Public } from '~/shared/decorators/public';

import { SheetAzureService } from '../sheet-azure-module/sheet-azure.service';

import { OauthRegistryService } from './oauth-registry-artifact.service';

const artifactSignature = config.app.artifactSignature;
const artifactOfAndre = config.app.artifactKey;
const andreEmail = config.azure.userEmail;
const refreshTimeWarning = config.azure.minutesForRefresh;

class initialAccessResponse {
  portalToken!: string;
  expiresIn!: number;
  needExcelAccess?: boolean;
}

@Controller('auth')
export class OauthRegistryController {
  constructor(
    private readonly oauthRegistryService: OauthRegistryService,
    private readonly sheetAzureService: SheetAzureService,
    private readonly logger: LoggerService,
    private readonly storageService: StorageService
  ) {}
  @Public()
  @Get('request-access')
  // Usuario Owner solicita acceso a la consola de control usando un token por defecto encriptado
  // y codificado en base 64, el token es estatico y se compone de un payload secreto y una firma secreta.
  async requestAccessToConsole(@Query('gateToken') gateToken: string): Promise<initialAccessResponse> {
    // se decofica y se genera un token de acceso temporal para el uso de la consola.
    try {
      // verify gate token
      const decodedToken = decodeURIComponent(gateToken);
      const verifyOptions: VerifyOptions = {
        algorithms: ['HS256'],
        ignoreExpiration: true,
      };
      const result = verify(decodedToken, artifactSignature, verifyOptions) as { artifact: string };

      if (!result?.artifact || result.artifact !== artifactOfAndre) throw new BadRequestException(errorCodes.MISSING_GATE_TOKEN.errorcode);

      // new portal token
      const payload = { artifact: artifactOfAndre };

      const token = sign(payload, artifactSignature, { algorithm: 'HS256', expiresIn: '25m' });
      const response: initialAccessResponse = { portalToken: encodeURIComponent(token), expiresIn: 1500 };

      const tokens = await this.storageService.getExcelToken(andreEmail);
      if (tokens?.expiresAt == null) {
        response.needExcelAccess = true;
        return response;
      }

      const now = new Date();
      if (tokens.expiresAt <= now) {
        response.needExcelAccess = true;
        return response;
      }

      const timeDiff = tokens.expiresAt.getTime() - now.getTime();
      const minutesInMs = refreshTimeWarning * 60 * 1000;
      if (timeDiff <= minutesInMs) {
        try {
          await this.sheetAzureService.refreshExcelAccessToken(tokens.refreshToken);
          response.needExcelAccess = false;
          return response;
        } catch (error) {
          this.logger.error('Failed to refresh Excel access token, despite the row existing: ' + (error instanceof Error ? error.message : 'Unknown error'));
          response.needExcelAccess = true;
          return response;
        }
      }
      response.needExcelAccess = false;
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw new InternalServerErrorException(errorCodes.INTERNAL_SERVER_ERROR.errorcode);
    }
  }

  //✅ solicitamos la pantalla de oauth
  @Get('sheet-window/:email')
  getSheetWindow(@Param('email') email: string): string {
    try {
      return this.sheetAzureService.requestExcelOAuth(email);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw error;
    }
  }
  //✅ microsoft lee este endpoint y se guarda el token en la hoja de excel.
  @Public()
  @Get('sheet-registry-account')
  async approveSheetAccount(@Query('code') code: string, @Query('state') state: string): Promise<void> {
    try {
      return await this.sheetAzureService.approveExcelOauth(code, state);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw error;
    }
  }
  //✅ solicitamos la pantalla de oauth
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
  //✅ microsoft lee este endpoint y se guarda el token en la hoja de excel.
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
