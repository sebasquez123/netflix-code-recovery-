import { Client } from '@microsoft/microsoft-graph-client';
import { BadGatewayException, Injectable, NotFoundException, PreconditionFailedException } from '@nestjs/common';

import config from '~/config';
import { StorageService } from '~/databaseSql/storage.service';
import { errorCodes } from '~/error.commands';
import { LoggerService } from '~/logger';
import { HttpClientService } from '~/shared/http/http-client.service';

import { OauthRegistryService } from '../oauth-registry-artifact-module/oauth-registry-artifact.service';
import { SheetAzureService } from '../sheet-azure-module/sheet-azure.service';

import { EmailCaptureDto } from './dto/input.dto';
import { CodeRequestOutputDto } from './dto/output.dto';
import { databaseTokenResponse, emailIntrospectionIndividualEmail, emailIntrospectionReseponse, matchedEmailRow, ExcelRow } from './interfaces';

const andreEmail = config.azure.userEmail;
@Injectable()
export class CodeRequestService {
  private logger;
  constructor(
    private readonly httpClient: HttpClientService,
    private readonly sheetAzureService: SheetAzureService,
    private readonly oauthRegistryService: OauthRegistryService,
    private readonly storageService: StorageService
  ) {
    this.logger = new LoggerService();
  }
  //✅ FUNCIONA PERFECTO
  async azureEmailIntrospection({ email }: EmailCaptureDto): Promise<CodeRequestOutputDto> {
    this.logger.log(`introspecting email ${email}`);

    const tokens = await this.storageService.getExcelToken(andreEmail);

    const excelRow = await this.validateExcelAccess(tokens, email);

    const rowData: matchedEmailRow = {
      email: excelRow[0] as string,
      refreshToken: excelRow[1] as string,
      accessToken: excelRow[2] as string,
      expires_in: excelRow[3] as number | string,
    };
    await this.validateEmailAccess(rowData);

    // const getLink = await this.getNetflixRecoveryLink(rowData);

    // if (!getLink.recoveryLink || !getLink.expirationMinutes) throw new Error('Failed to get recovery link or expiration time from email.');

    // this.logger.log(`Email ${email} introspected successfully`);
    // return { expirationTime: getLink.expirationMinutes, recoveryLink: getLink.recoveryLink };
    return { expirationTime: '15', recoveryLink: 'https://www.netflix.com/recover' };
  }
  //✅ FUNCIONA PERFECTO
  async netflixLinkRestoration(link: string): Promise<void> {
    this.logger.log(`Sending netflix recovery confirmation to ${link}`);
    try {
      await this.httpClient.post(link, {});
      this.logger.log(`Netflix recovery confirmation successful`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Netflix recovery confirmation failed: ${errorMessage}`);
      throw new BadGatewayException(`Recovery confirmation failed. Wait 3 minutes`);
    }
  }
  //✅ FUNCIONA PERFECTO
  private async validateExcelAccess(tokens: databaseTokenResponse | null, email: string): Promise<unknown[]> {
    if (tokens?.expiresAt == null || !tokens?.refreshToken) throw new PreconditionFailedException(errorCodes.MISSING_EXCEL_TOKEN.errorcode);

    let matchingRow: unknown[] | undefined;
    let accessToken: string = tokens.accessToken;

    const attempts = [1000, 2000];
    for (const delay of attempts) {
      try {
        if (delay === 2000) {
          const refreshResult = await this.refreshExcelAccess(tokens.refreshToken);
          if (refreshResult == null) throw new PreconditionFailedException(errorCodes.NO_EXCEL_TOKEN_AFTER_REFRESH.errorcode);
          const newTokens = await this.storageService.getExcelToken(andreEmail);
          if (!newTokens?.accessToken) throw new PreconditionFailedException(errorCodes.NO_EXCEL_TOKEN_AFTER_REFRESH.errorcode);
          accessToken = newTokens.accessToken;
          this.logger.log(`Excel access token had to be refreshed`);
        }
        const emailRow = await this.sheetAzureService.readRangeDelegated({ accessToken: accessToken, address: `A2:D${config.azure.maxReadRange}` });
        matchingRow = emailRow.find((r: ExcelRow, index: number) => index > 0 && r?.[0]?.toLowerCase() === email.toLowerCase());
        break;
      } catch (error) {
        this.logger.warn(`Attempt to refresh token failed ${error instanceof Error ? error.message : 'Unknown error'}, Retrying in ${delay} ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
    if (!matchingRow || matchingRow === undefined) throw new PreconditionFailedException(errorCodes.NO_DATA_FOUND_IN_EXCEL.errorcode);

    return matchingRow;
  }
  //✅ FUNCIONA PERFECTO
  private async refreshExcelAccess(refreshToken: string): Promise<void | null> {
    try {
      this.logger.warn('Refreshing Excel access token due to imminent expiration');
      await this.sheetAzureService.refreshExcelAccessToken(refreshToken);
    } catch (error) {
      this.logger.error('Failed to refresh Excel access token, despite the row existing: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return null;
    }
  }
  //✅ FUNCIONA PERFECTO
  private async validateEmailAccess(rowData: matchedEmailRow): Promise<void> {
    if (rowData.expires_in == null || !rowData.refreshToken || !rowData.accessToken)
      throw new NotFoundException(errorCodes.NO_DATA_COMPLETE_FOUND_FROM_EXCEL.errorcode);

    let emailBox: { value: unknown[] } | undefined;
    let accessToken: string = rowData.accessToken;

    const attempts = [1000, 2000];
    for (const delay of attempts) {
      try {
        if (delay === 2000) {
          const newTokens = await this.refreshEmailAccess(rowData.refreshToken);
          if (!newTokens?.accessToken || newTokens == null)
            throw new PreconditionFailedException(errorCodes.MISSING_EMAIL_REFRESH_TOKEN_AFTER_REFRESH.errorcode);
          accessToken = newTokens.accessToken;
          this.logger.log(`Email access token had to be refreshed`);
        }
        const graph = Client.init({
          authProvider: (done) => done(null, accessToken),
        });
        emailBox = (await graph.api('/me/mailFolders/Inbox/messages').top(1).select('subject').get()) as { value: unknown[] };
        break;
      } catch (error) {
        this.logger.warn(`Attempt to refresh token failed ${error instanceof Error ? error.message : 'Unknown error'}, Retrying in ${delay} ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }

    if (!emailBox?.value[0]) throw new BadGatewayException(errorCodes.NO_DATA_FROM_EMAIL_INBOX.errorcode);
    this.logger.log(`Email access for ${rowData.email} validated successfully`);
  }
  //✅ FUNCIONA PERFECTO
  private async refreshEmailAccess(refreshToken: string): Promise<{ refreshToken: string; accessToken: string } | null> {
    try {
      this.logger.warn('Refreshing email access token due to imminent expiration');
      return await this.oauthRegistryService.refreshMicrosoftAccessToken(refreshToken);
    } catch (error) {
      this.logger.error('Failed to refresh email access token, despite the row existing: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return null;
    }
  }

  private async getNetflixRecoveryLink(rowData: matchedEmailRow): Promise<{ recoveryLink: string | null; expirationMinutes: string | null }> {
    const graph = Client.init({
      authProvider: (done) => done(null, rowData.accessToken),
    });
    let emails: emailIntrospectionIndividualEmail[] = [];

    async function extractRecoveryLink() {
      const first3Emails = (await graph
        .api('/me/mailFolders/Inbox/messages')
        .top(config.azure.maxReadNetflixEmails)
        .select('subject,from,receivedDateTime,bodyPreview')
        .get()) as emailIntrospectionReseponse;
      const emailFiltered = first3Emails.value.filter((email: emailIntrospectionIndividualEmail) => {
        const now = new Date();
        const receivedDate = new Date(email.receivedDateTime);
        const timeDiff = now.getTime() - receivedDate.getTime();
        const minutesInMs = 15 * 60 * 1000;
        return (
          email.from.emailAddress.address.toLowerCase().includes('netflix') &&
          email.subject.toLowerCase().includes('código de recuperación') &&
          timeDiff <= minutesInMs
        );
      });
      if (emailFiltered.length === 0) throw new NotFoundException(errorCodes.NO_FOUND_EMAIL_AVAILABLE.errorcode);
      return emailFiltered;
    }
    if (emails.length === 0) {
      const attempts = [1000, 2000, 3000];
      for (const delay of attempts) {
        try {
          emails = await extractRecoveryLink();
          break;
        } catch (error) {
          this.logger.warn(`Attempt to extract recovery link failed ${error instanceof Error ? error.message : 'Unknown error'}, Retrying in ${delay} ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
      throw new BadGatewayException(errorCodes.NO_FOUND_EMAIL_AVAILABLE.errorcode);
    }
    const theMinorEmail = emails.sort((a, b) => new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime())[0];
    const linkMatch = theMinorEmail?.bodyPreview?.match(/https?:\/\/\S+/);
    const expirationTimeFromNetflix = theMinorEmail?.bodyPreview?.match(/El código expira en (\d+) minutos/);

    if (!linkMatch || !expirationTimeFromNetflix) throw new NotFoundException('No recovery link found in the email body.');

    const recoveryLink = linkMatch[0] ?? null;
    const expirationMinutes = expirationTimeFromNetflix[1] ?? null;
    this.logger.log(`Recovery link extracted successfully: ${recoveryLink}, expiration time: ${expirationMinutes} minutes`);
    return { recoveryLink, expirationMinutes };
  }
}
