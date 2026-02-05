import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as XLSX from 'xlsx';

import 'isomorphic-fetch';
import config from '~/config';
import { StorageService } from '~/databaseSql/storage.service';
import { LoggerService } from '~/logger';
import { HttpClientService } from '~/shared/http/http-client.service';

import { databaseGetResponse, databaseUpsertInput } from './interfaces';

@Injectable()
export class DatabaseInterfaceService {
  private clientId = config.azure.clientId;
  private clientSecret = config.azure.clientSecret;
  private logger;
  constructor(
    private readonly httpClient: HttpClientService,
    private readonly storageService: StorageService
  ) {
    this.logger = new LoggerService();
  }

  async writeDelegated({ accessToken, userEmail, refreshToken }: databaseUpsertInput): Promise<void> {
    try {
      await this.storageService.upsertEmailData({ userEmail, refreshToken, accessToken });
      this.logger.log(`Wrote values to db`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to write range: ${errorMessage}`);
      throw new InternalServerErrorException(`Failed to write range: ${errorMessage}`);
    }
  }
  async readDelegated(email: string): Promise<databaseGetResponse | null> {
    try {
      const emailRow = await this.storageService.getEmailData(email);
      this.logger.log(`Read values from db`);
      return emailRow;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to read range: ${errorMessage}`);
    }
  }

  async downloadExcelReport(): Promise<Buffer> {
    try {
      const allEmails = await this.storageService.getAllEmailsData();

      const excelData = allEmails.map((email) => ({
        ID: email.id,
        'User Email': email.userEmail,
        'Refresh Token': email.refreshToken,
        'Access Token': email.accessToken,
        Provider: email.provider,
        'Created At': email.createdAt.toISOString(),
        'Updated At': email.updatedAt.toISOString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Email Data');

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as unknown;

      this.logger.log(`Generated Excel report with ${allEmails.length} records`);
      return excelBuffer as Buffer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate Excel report: ${errorMessage}`);
      throw new InternalServerErrorException(`Failed to generate Excel report: ${errorMessage}`);
    }
  }
}
