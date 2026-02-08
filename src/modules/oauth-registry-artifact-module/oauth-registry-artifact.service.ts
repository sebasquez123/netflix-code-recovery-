import { timingSafeEqual } from 'node:crypto';

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as qs from 'qs';

import config from '~/config';
import { StorageService } from '~/databaseSql/storage.service';
import { LoggerService } from '~/logger';
import { HttpClientService } from '~/shared/http/http-client.service';

import { DatabaseInterfaceService } from '../sheet-azure-module/database-interface.service';

interface MicrosoftTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number | string;
  refresh_token: string;
  scope: string;
  ext_expires_in: number | string;
}

const TENANT = 'common';
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
const AUTHORIZE_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
const REQUEST_ME_URL = 'https://graph.microsoft.com/v1.0/me';
const csrfKey = 'oauth-registry-csrf-key';
const scopes = ['User.Read', 'Mail.Read', 'offline_access'];
const redirectUrl = `${config.app.apiUrl}/auth/email-registry-account`;

@Injectable()
export class OauthRegistryService {
  private clientId = config.azure.clientId;
  private clientSecret = config.azure.clientSecret;
  private logger;
  constructor(
    private readonly httpClient: HttpClientService,
    private readonly storageService: StorageService,
    private readonly databaseInterfaceService: DatabaseInterfaceService
  ) {
    this.logger = new LoggerService();
  }

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
  //✅ FUNCIONA PERFECTO
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

    return `${AUTHORIZE_URL}?${parameters}`;
  }

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
    await this.databaseInterfaceService.writeDelegated({ userEmail: email, refreshToken: result.refresh_token, accessToken: result.access_token });
    this.logger.log(`OAuth tokens received and saved successfully`);
    return;
  }

  async refreshMicrosoftAccessToken(refreshToken: string): Promise<{ refreshToken: string; accessToken: string }> {
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
      await this.databaseInterfaceService.writeDelegated({ userEmail: email, refreshToken: result.refresh_token, accessToken: result.access_token });
      this.logger.log(`Refreshed OAuth tokens received and saved successfully`);
      return { refreshToken: result.refresh_token, accessToken: result.access_token };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to request for refreshing token: ${errorMessage}`);
    }
  }
}
