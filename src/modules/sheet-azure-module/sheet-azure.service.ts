import { timingSafeEqual } from 'node:crypto';

import { Client } from '@microsoft/microsoft-graph-client';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as qs from 'qs';

import 'isomorphic-fetch';
import config from '~/config';
import { StorageService, UpsertExcelTokenParameters } from '~/databaseSql/storage.service';
import { LoggerService } from '~/logger';
import { HttpClientService } from '~/shared/http/http-client.service';

import { readRangeInput, writeRangeInput, MicrosoftTokenResponse } from './interfaces';

const TENANT = 'common';
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
const AUTHORIZE_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
const csrfKey = 'oauth-registry-csrf-key';
const scopes = ['Files.ReadWrite', 'offline_access'];
const redirectUrl = `${config.app.apiUrl}/auth/sheet-registry-account`;

const itemId = config.azure.excelItemId;
const worksheet = config.azure.excelWorksheet;
const driveId = config.azure.excelDriveId;

@Injectable()
export class SheetAzureService {
  private clientId = config.azure.clientId;
  private clientSecret = config.azure.clientSecret;
  private logger;
  constructor(
    private readonly httpClient: HttpClientService,
    private readonly storageService: StorageService
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

  //✅ FUNCIONA PERFECTO.
  requestExcelOAuth(): string {
    this.logger.log(`Requesting Microsoft OAuth for email: ${config.azure.userEmail}`);

    const parameters = qs.stringify({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUrl,
      response_mode: 'query',
      scope: scopes.join(' '),
      prompt: 'consent',
      state: this.generateState(),
      login_hint: config.azure.userEmail,
    });
    return `${AUTHORIZE_URL}?${parameters}`;
  }
  //✅ FUNCIONA PERFECTO
  async approveExcelOauth(code: string, state: string): Promise<void> {
    const ok = this.equalsState(this.generateState(), state);
    if (!ok) throw new InternalServerErrorException('Invalid state parameter');
    const data = qs.stringify({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUrl,
      scope: scopes.join(' '),
    });
    const result: MicrosoftTokenResponse = await this.httpClient.post(TOKEN_URL, data, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const upsert: UpsertExcelTokenParameters = {
      userEmail: config.azure.userEmail,
      refreshToken: result.refresh_token,
      accessToken: result.access_token,
      expiresAt: new Date(Date.now() + Number(result.expires_in) * 1000),
      scope: result.scope,
    };
    await this.storageService.upsertExcelToken(upsert);
    this.logger.log(`OAuth tokens received and saved successfully`);
    return;
  }
  //✅ FUNCIONA PERFECTO
  async refreshExcelAccessToken(refreshToken: string): Promise<void> {
    try {
      const data = qs.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: scopes.join(' '),
      });
      const result: MicrosoftTokenResponse = await this.httpClient.post(TOKEN_URL, data, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const upsert: UpsertExcelTokenParameters = {
        userEmail: config.azure.userEmail,
        refreshToken: result.refresh_token,
        accessToken: result.access_token,
        expiresAt: new Date(Date.now() + Number(result.expires_in) * 1000),
        scope: result.scope,
      };
      await this.storageService.upsertExcelToken(upsert);
      this.logger.log(`Refreshed OAuth tokens received and saved successfully`);
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to request for refreshing token: ${errorMessage}`);
    }
  }

  //✅ FUNCIONA PERFECTO
  async writeRangeDelegated({ accessToken, values, address }: writeRangeInput): Promise<void> {
    try {
      const graph = Client.init({
        authProvider: (done) => done(null, accessToken),
      });
      await graph.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${worksheet}')/range(address='${address}')`).patch({ values });
      this.logger.log(`Wrote values to item ${itemId} ${worksheet} ${address}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to write range: ${errorMessage}`);
      throw new InternalServerErrorException(`Failed to write range: ${errorMessage}`);
    }
  }
  //✅ FUNCIONA PERFECTO
  async readRangeDelegated({ accessToken, address = `A2:A${config.azure.maxReadRange}` }: readRangeInput): Promise<unknown[][]> {
    try {
      const graph = Client.init({
        authProvider: (done) => done(null, accessToken),
      });
      const range = (await graph
        .api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${worksheet}')/range(address='${address}')`)
        .get()) as unknown as {
        values: unknown[][];
      };
      const values = Array.isArray(range?.values) ? range.values : [];
      this.logger.log(`Read values from ${itemId} ${worksheet} ${address}`);
      return values;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to read range: ${errorMessage}`);
    }
  }
}
