import { Client } from '@microsoft/microsoft-graph-client';
import { BadGatewayException, Injectable, NotFoundException, PreconditionFailedException } from '@nestjs/common';

import config from '~/config';
import { errorCodes } from '~/error.commands';
import { LoggerService } from '~/logger';
import { HttpClientService } from '~/shared/http/http-client.service';

import { OauthRegistryService } from '../oauth-registry-artifact-module/oauth-registry-artifact.service';
import { DatabaseInterfaceService } from '../sheet-azure-module/database-interface.service';

import { EmailCaptureDto } from './dto/input.dto';
import { NetflixRequestOutputDto } from './dto/output.dto';
import { emailIntrospectionIndividualEmail, emailIntrospectionReseponse, matchedEmailRow, extractedSignInCode } from './interfaces';

@Injectable()
export class CodeRequestService {
  private logger;
  constructor(
    private readonly httpClient: HttpClientService,
    private readonly databaseInterfaceService: DatabaseInterfaceService,
    private readonly oauthRegistryService: OauthRegistryService
  ) {
    this.logger = new LoggerService();
  }
  //✅ FUNCIONA PERFECTO
  async azureEmailIntrospection({ email }: EmailCaptureDto): Promise<NetflixRequestOutputDto> {
    this.logger.log(`introspecting email ${email}`);

    const emailRow = await this.databaseInterfaceService.readDelegated(email);

    if (!emailRow) throw new NotFoundException('no email found in database');

    const rowData: matchedEmailRow = {
      email: emailRow.userEmail,
      refreshToken: emailRow.refreshToken,
      accessToken: emailRow.accessToken,
    };

    await this.validateEmailAccess(rowData);

    const emails = await this.getNetflixEmails(rowData);

    const loginCode = emails.filter((emailCode) => emailCode.subject.toLowerCase().includes('tu código de inicio de sesión'));
    // const recoveryLinkEmails = emails.filter((emailRecovery) => emailRecovery.subject.toLowerCase().includes('actulizar hogar'));

    let signInObject: extractedSignInCode | null = null;
    // let recoveryLinkObject: extractedRecoveryLink | null = null;

    if (loginCode.length > 0) signInObject = this.extractSignInCode(loginCode);
    // if (recoveryLinkEmails.length > 0) recoveryLinkObject = await this.extractRecoveryLink(recoveryLinkEmails);

    this.logger.log(`Email ${email} introspected successfully`);
    // return { extractedRecoveryLink: recoveryLinkObject, extractedSignInCode: signInObject };
    return { extractedRecoveryLink: null, extractedSignInCode: signInObject };
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
  private async validateEmailAccess(rowData: matchedEmailRow): Promise<void> {
    if (!rowData.refreshToken || !rowData.accessToken) throw new NotFoundException(errorCodes.NO_DATA_COMPLETE_FROM_DB.errorcode);

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

  private async getNetflixEmails(rowData: matchedEmailRow): Promise<emailIntrospectionIndividualEmail[]> {
    const graph = Client.init({
      authProvider: (done) => done(null, rowData.accessToken),
    });
    let emails: emailIntrospectionIndividualEmail[] = [];
    async function extractRecoveryLink() {
      const first3Emails = (await graph
        .api('/me/mailFolders/Inbox/messages')
        .top(config.azure.maxReadNetflixEmails)
        .select('subject,from,receivedDateTime,body')
        .header('Prefer', 'outlook.body-content-type="text"')
        .get()) as emailIntrospectionReseponse;
      const emailFiltered = first3Emails.value.filter((email: emailIntrospectionIndividualEmail) => {
        // const now = new Date();
        // const receivedDate = new Date(email.receivedDateTime);
        // const timeDiff = now.getTime() - receivedDate.getTime();
        // const minutesInMs = 15 * 60 * 1000;
        // timeDiff <= minutesInMs
        return (
          email.from.emailAddress.address.toLowerCase().includes('netflix') &&
          (email.subject.toLowerCase().includes('tu código de inicio de sesión') || email.subject.toLowerCase().includes('actualizar hogar'))
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
      if (emails.length === 0) throw new BadGatewayException(errorCodes.NO_FOUND_EMAIL_AVAILABLE.errorcode);
    }

    return emails;
  }

  // private async extractRecoveryLink(emails: emailIntrospectionIndividualEmail[]): Promise<{ recoveryLink: string; time: Date }> {
  //   const theMinorEmail = emails.sort((a, b) => new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime())[0];
  //   const linkMatch = theMinorEmail?.body.content.match(/https?:\/\/\S+/);
  //   const receivedTime = theMinorEmail?.receivedDateTime;

  //   if (!linkMatch || !receivedTime) throw new NotFoundException('No recovery link found in the email body.');

  //   const recoveryLink = linkMatch[0];
  //   const time = new Date(receivedTime);
  //   this.logger.log(`Recovery link extracted successfully: ${recoveryLink}, time: ${time.getTime()} `);
  //   return { recoveryLink, time };
  // }

  private extractSignInCode(emails: emailIntrospectionIndividualEmail[]): { signInCode: string | null; time: Date } {
    const theMinorEmail = emails.sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime())[0];
    const codeMatch = theMinorEmail?.body.content.match(/Ingresa este código para iniciar sesión\s*(\d{4})\s*Ingresa este código en tu dispositivo/);
    const receivedTime = theMinorEmail?.receivedDateTime;
    const signInCode = codeMatch?.[1] ?? null;

    if (!codeMatch || !receivedTime || !signInCode) throw new NotFoundException('No code found in the email body.');

    const time = new Date(receivedTime);
    this.logger.log(`Sign-in code extracted successfully: ${signInCode}, time: ${time.getTime()} `);
    return { signInCode, time };
  }
}
