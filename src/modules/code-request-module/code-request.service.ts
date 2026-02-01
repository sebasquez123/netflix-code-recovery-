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

interface ExcelRow extends Array<unknown> {
  0?: string;
}

interface matchedEmailRow {
  email: string;
  refreshToken: string;
  accessToken: string;
  expires_in: number | string;
  ext_expires_in: number | string;
}
interface emailIntrospectionReseponse {
  value: emailIntrospectionIndividualEmail[];
}
interface emailIntrospectionIndividualEmail {
  subject: string;
  from: { emailAddress: { name: string; address: string } };
  receivedDateTime: string;
  bodyPreview: string;
}

const andreEmail = config.azure.userEmail;
const refreshTimeWarning = config.azure.minutesForRefresh;

interface databaseTokenResponse {
  id: number;
  provider: string;
  userEmail: string;
  refreshToken: string;
  accessToken: string;
  expiresAt: Date | null;
  scope: string | null;
  createdAt: Date;
  updatedAt: Date;
}
@Injectable()
export class CodeRequestService {
  constructor(
    private readonly logger: LoggerService,
    private readonly httpClient: HttpClientService,
    private readonly sheetAzureService: SheetAzureService,
    private readonly oauthRegistryService: OauthRegistryService,
    private readonly storageService: StorageService
  ) {}
  async azureEmailIntrospection({ email }: EmailCaptureDto): Promise<CodeRequestOutputDto> {
    this.logger.log(`introspecting email ${email}`);

    const tokens = await this.storageService.getExcelToken(andreEmail);

    const excelRow = await this.validateExcelAccess(tokens, email);

    if (!excelRow || excelRow.length === 0) throw new Error('No Excel row found for the configured user, recommended reauth the excel again.');

    const rowData: matchedEmailRow = {
      email: excelRow[0] as string,
      refreshToken: excelRow[1] as string,
      accessToken: excelRow[2] as string,
      expires_in: excelRow[3] as number | string,
      ext_expires_in: excelRow[4] as number | string,
    };
    await this.validateEmailAccess(rowData);

    const getLink = await this.getNetflixRecoveryLink(rowData);

    if (!getLink.recoveryLink || !getLink.expirationMinutes) throw new Error('Failed to get recovery link or expiration time from email.');

    this.logger.log(`Email ${email} introspected successfully`);
    return { expirationTime: getLink.expirationMinutes, recoveryLink: getLink.recoveryLink };
  }

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

  private async validateExcelAccess(tokens: databaseTokenResponse | null, email: string): Promise<unknown[]> {
    if (tokens?.expiresAt == null) throw new PreconditionFailedException('Excel access token not found at DB, suggest to re authorize.');
    const now = new Date();
    if (tokens.expiresAt <= now) throw new PreconditionFailedException(errorCodes.MISSING_EXCEL_TOKEN.errorcode);

    const timeDiff = tokens.expiresAt.getTime() - now.getTime();
    const minutesInMs = refreshTimeWarning * 60 * 1000;
    if (timeDiff <= minutesInMs) {
      try {
        await this.sheetAzureService.refreshExcelAccessToken(tokens.refreshToken);
      } catch (error) {
        this.logger.error('Failed to refresh Excel access token, despite the row existing: ' + (error instanceof Error ? error.message : 'Unknown error'));
        throw new BadGatewayException('Excel access token expired, couldnt refresh automatically, suggest to talk with support.');
      }
    }
    const emailRow = await this.sheetAzureService.readRangeDelegated({ accessToken: tokens.accessToken });
    const matchingRow = emailRow.find((r: ExcelRow) => r?.[0]?.toLowerCase() === email.toLowerCase());

    if (!matchingRow || matchingRow === undefined)
      throw new PreconditionFailedException('No Excel row found for the configured user, recommended reauth the excel again.');

    return matchingRow;
  }

  private async validateEmailAccess(rowData: matchedEmailRow): Promise<void> {
    if (rowData.expires_in == null) throw new NotFoundException('Microsoft access token not found at DB, suggest to re authorize.');

    const now = new Date();
    const expiresAt = new Date(Date.now() + (rowData.expires_in as number) * 1000);
    if (expiresAt <= now) throw new PreconditionFailedException('Microsoft access token expired, suggest to re authorize.');
    const timeDiff = expiresAt.getTime() - now.getTime();
    const minutesInMs = refreshTimeWarning * 60 * 1000;
    if (timeDiff <= minutesInMs) {
      try {
        await this.oauthRegistryService.refreshMicrosoftAccessToken(rowData.refreshToken);
      } catch (error) {
        this.logger.error('Failed to refresh Microsoft access token, despite the row existing: ' + (error instanceof Error ? error.message : 'Unknown error'));
        throw new BadGatewayException('Microsoft access token expired, couldnt refresh automatically, suggest to talk with support.');
      }
    }

    const graph = Client.init({
      authProvider: (done) => done(null, rowData.accessToken),
    });
    const result = (await graph.api('/me/mailFolders/Inbox/messages').top(1).get()) as { value: unknown[] };
    if (result.value[0] == null) throw new BadGatewayException('Failed to introspect email inbox, suggest to talk support.');
    this.logger.log(`Email access for ${rowData.email} validated successfully`);
  }

  private async getNetflixRecoveryLink(rowData: matchedEmailRow): Promise<{ recoveryLink: string | null; expirationMinutes: string | null }> {
    const graph = Client.init({
      authProvider: (done) => done(null, rowData.accessToken),
    });
    let emails: emailIntrospectionIndividualEmail[] = [];

    async function extractRecoveryLink() {
      const first5Emails = (await graph
        .api('/me/mailFolders/Inbox/messages')
        .top(5)
        .select('subject,from,receivedDateTime,bodyPreview')
        .get()) as emailIntrospectionReseponse;
      const emailFiltered = first5Emails.value.filter((email: emailIntrospectionIndividualEmail) => {
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
      if (emailFiltered.length === 0) throw new NotFoundException('No recovery emails found in the last 15 minutes from Netflix.');
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
      throw new BadGatewayException(`Failed to extract recovery link, server failure after multiple attempts.`);
    }
    const theMinorEmail = emails.sort((a, b) => new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime())[0];
    const linkMatch = theMinorEmail?.bodyPreview?.match(/https?:\/\/\S+/);
    const expirationTimeFromNetflix = theMinorEmail?.bodyPreview?.match(/El código expira en (\d+) minutos/);

    if (!linkMatch || !expirationTimeFromNetflix) throw new NotFoundException('No recovery link found in the email body.');

    const recoveryLink = linkMatch[0] ?? null;
    const expirationMinutes = expirationTimeFromNetflix[1] ?? null;
    this.logger.log(`Code expiration time extracted successfully: ${expirationMinutes} minutes`);
    this.logger.log(`Recovery link extracted successfully: ${recoveryLink}`);
    return { recoveryLink, expirationMinutes };
  }
}
