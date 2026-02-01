import { timingSafeEqual } from 'node:crypto';

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as qs from 'qs';

import config from '~/config';
import { StorageService } from '~/databaseSql/storage.service';
import { errorCodes } from '~/error.commands';
import { LoggerService } from '~/logger';
import { HttpClientService } from '~/shared/http/http-client.service';

import { SheetAzureService } from '../sheet-azure-module/sheet-azure.service';

interface MicrosoftTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number | string;
  refresh_token: string;
  scope: string;
  ext_expires_in: number | string;
}

interface ExcelRow extends Array<unknown> {
  0?: string;
}

const TENANT = 'common';
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
const AUTHORIZE_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
const REQUEST_ME_URL = 'https://graph.microsoft.com/v1.0/me';
const csrfKey = 'oauth-registry-csrf-key';
const scopes = ['Mail.Read', 'offline_access'];
const redirectUrl = `${config.app.apiUrl}/auth/registry-account`;
const andreEmail = config.azure.userEmail;

@Injectable()
export class OauthRegistryService {
  private clientId = config.azure.clientId;
  private clientSecret = config.azure.clientSecret;
  constructor(
    private readonly logger: LoggerService,
    private readonly httpClient: HttpClientService,
    private readonly storageService: StorageService,
    private readonly sheetAzureService: SheetAzureService
  ) {}

  private generateState(): string {
    const key = Buffer.from(csrfKey);
    const normalizedKey = this.normalizeBase64Url(key.toString('base64'));
    return normalizedKey;
  }

  private normalizeBase64Url(s: string): string {
    return s.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  }

  private equalsState(stored: string, received: string): boolean {
    const a = Buffer.from(this.normalizeBase64Url(stored));
    const b = Buffer.from(this.normalizeBase64Url(received));
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
  //✅
  requestMicrosoftOAuth(email: string): string {
    this.logger.log(`Requesting Microsoft OAuth for email: ${email}`);

    const parameters = qs.stringify({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUrl,
      response_mode: 'query',
      scope: scopes.join(' '),
      prompt: 'consent',
      state: this.generateState(),
      login_hint: email,
    });

    this.logger.log(`Requesting Microsoft OAuth`);
    return `${AUTHORIZE_URL}?${parameters}`;
  }
  //✅
  async approveMicrosoftOauth(code: string, state: string): Promise<void> {
    this.logger.log(`Approving email OAuth`);
    const ok = this.equalsState(this.generateState(), state);
    if (!ok) throw new InternalServerErrorException('Invalid state parameter');
    const data = qs.stringify({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      scope: scopes.join(' '),
      redirect_uri: redirectUrl,
    });
    const result: MicrosoftTokenResponse = await this.httpClient.post(TOKEN_URL, data, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const me: { mail: string } = await this.httpClient.get(REQUEST_ME_URL, {
      headers: {
        Authorization: `Bearer ${result.access_token}`,
      },
    });
    const email = me.mail;
    const tokens = await this.storageService.getExcelToken(andreEmail);
    if (tokens?.accessToken == null) throw new InternalServerErrorException(errorCodes.MISSING_EXCEL_TOKEN.errorcode);
    const rows = await this.sheetAzureService.readRangeDelegated({ accessToken: tokens.accessToken });
    let rowIndex = rows.findIndex((r: ExcelRow) => r?.[0]?.toLowerCase() === email.toLowerCase());

    if (rowIndex === -1) {
      rowIndex = rows.length;
    }
    await this.sheetAzureService.writeRangeDelegated({
      accessToken: tokens.accessToken,
      values: [[email, result.refresh_token, result.access_token, result.expires_in, result.ext_expires_in]],
      address: `A${rowIndex + 1}:E${rowIndex + 1}`,
    });
    this.logger.log(`OAuth tokens received: ${JSON.stringify(result)}`);
    return;
  }
  //✅
  async refreshMicrosoftAccessToken(refreshToken: string): Promise<void> {
    try {
      const data = qs.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: scopes.join(' '),
      });
      const result: MicrosoftTokenResponse = await this.httpClient.post(TOKEN_URL, data, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const me: { mail: string } = await this.httpClient.get(REQUEST_ME_URL, {
        headers: {
          Authorization: `Bearer ${result.access_token}`,
        },
      });
      const email = me.mail;
      const tokens = await this.storageService.getExcelToken(andreEmail);
      if (tokens?.accessToken == null) throw new InternalServerErrorException(errorCodes.MISSING_EXCEL_TOKEN.errorcode);
      const rows = await this.sheetAzureService.readRangeDelegated({ accessToken: tokens.accessToken });
      let rowIndex = rows.findIndex((r: ExcelRow) => r?.[0]?.toLowerCase() === email.toLowerCase());

      if (rowIndex === -1) {
        rowIndex = rows.length;
      }
      await this.sheetAzureService.writeRangeDelegated({
        accessToken: tokens.accessToken,
        values: [[email, result.refresh_token, result.access_token, result.expires_in, result.ext_expires_in]],
        address: `A${rowIndex + 1}:E${rowIndex + 1}`,
      });
      this.logger.log(`Refreshed OAuth tokens received: ${JSON.stringify(result)}`);
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to request for refreshing token: ${errorMessage}`);
    }
  }
}
