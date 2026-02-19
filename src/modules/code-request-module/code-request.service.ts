import { Client } from '@microsoft/microsoft-graph-client';
import { BadGatewayException, Injectable, NotFoundException, PreconditionFailedException } from '@nestjs/common';

import config from '~/config';
import { errorCodes } from '~/error.commands';
import { LoggerService } from '~/logger';

import { OauthRegistryService } from '../oauth-registry-artifact-module/oauth-registry-artifact.service';
import { DatabaseInterfaceService } from '../sheet-azure-module/database-interface.service';

import { EmailCaptureDto } from './dto/input.dto';
import { NetflixRequestOutputDto } from './dto/output.dto';
import {
  emailIntrospectionIndividualEmail,
  emailIntrospectionReseponse,
  matchedEmailRow,
  extractedSignInCode,
  extractedActualizarHogarLink,
  extractedSignInLink,
} from './interfaces';

enum emailSubjects {
  SIGN_IN_CODE = 'tu código de inicio de sesión',
  SIGN_IN_LINK = 'acceso temporal de netflix',
  RECOVERY_LINK = 'actualizar tu hogar con netflix',
}
interface interceptorIdentifiers {
  interceptorRegex: RegExp;
  type: emailSubjects;
  identifier: string;
}
const interceptorIdentifiers = {
  signInCode: {
    interceptorRegex: /ingresa este código para iniciar sesión\s*(\d{4})\s*ingresa este código en tu dispositivo/i,
    type: emailSubjects.SIGN_IN_CODE,
    identifier: emailSubjects.SIGN_IN_CODE.valueOf(),
  },
  temporalSignIng: {
    interceptorRegex: /obtener código<([^>]+)>/i,
    type: emailSubjects.SIGN_IN_LINK,
    identifier: emailSubjects.SIGN_IN_LINK,
  },
  actualizarHogar: {
    interceptorRegex: /sí, la envié yo<([^>]+)>/i,
    type: emailSubjects.RECOVERY_LINK,
    identifier: emailSubjects.RECOVERY_LINK.valueOf(),
  },
};
@Injectable()
export class CodeRequestService {
  private logger;
  constructor(
    private readonly databaseInterfaceService: DatabaseInterfaceService,
    private readonly oauthRegistryService: OauthRegistryService
  ) {
    this.logger = new LoggerService();
  }
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
    const loginCodeEmails = emails.filter((emailCode) => emailCode.subject.toLowerCase().includes(interceptorIdentifiers.signInCode.identifier));
    const temporalSignInLinkEmails = emails.filter((emailRecovery) =>
      emailRecovery.subject.toLowerCase().includes(interceptorIdentifiers.temporalSignIng.identifier)
    );
    const actualizarHogarLinkEmails = emails.filter((emailRecovery) =>
      emailRecovery.subject.toLowerCase().includes(interceptorIdentifiers.actualizarHogar.identifier)
    );
    let signInObject: extractedSignInCode | null = null;
    let temporalSignInObject: extractedSignInLink | null = null;
    let actualizarHogarLinkObject: extractedActualizarHogarLink | null = null;

    if (loginCodeEmails.length > 0) signInObject = this.extractSignInCode(loginCodeEmails);
    if (temporalSignInLinkEmails.length > 0) temporalSignInObject = this.extractTemporalSignInCode(temporalSignInLinkEmails);
    if (actualizarHogarLinkEmails.length > 0) actualizarHogarLinkObject = this.extractActualizarHogarLink(actualizarHogarLinkEmails);

    this.logger.log(
      `Email ${email} introspection went successfully, Found:${actualizarHogarLinkObject ? interceptorIdentifiers.actualizarHogar.type : ''} ${signInObject ? `& ${interceptorIdentifiers.signInCode.type}` : ''} ${temporalSignInObject ? `& ${interceptorIdentifiers.temporalSignIng.type}` : ''}`
    );
    return { extractedActualizarHogarLink: actualizarHogarLinkObject, extractedSignInCode: signInObject, extractedTemporalSignInLink: temporalSignInObject };
  }
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
        const now = new Date();
        const receivedDate = new Date(email.receivedDateTime);
        const timeDiff = now.getTime() - receivedDate.getTime();
        const limitMinutesInMs = 16 * 60 * 1000;
        return (
          email.from.emailAddress.address.toLowerCase().includes('netflix') &&
          (email.subject.toLowerCase().includes(interceptorIdentifiers.signInCode.identifier) ||
            email.subject.toLowerCase().includes(interceptorIdentifiers.actualizarHogar.identifier) ||
            email.subject.toLowerCase().includes(interceptorIdentifiers.temporalSignIng.identifier)) &&
          timeDiff <= limitMinutesInMs
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
          this.logger.warn(`Attempt to extract netflix emails failed ${error instanceof Error ? error.message : 'Unknown error'}, Retrying in ${delay} ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
      if (emails.length === 0) throw new BadGatewayException(errorCodes.NO_FOUND_EMAIL_AVAILABLE.errorcode);
    }
    return emails;
  }

  private extractActualizarHogarLink(emails: emailIntrospectionIndividualEmail[]): extractedActualizarHogarLink | null {
    const theMinorEmail = emails.sort((a, b) => new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime())[0];
    const linkMatch = theMinorEmail?.body.content.match(interceptorIdentifiers.actualizarHogar.interceptorRegex);
    const receivedTime = theMinorEmail?.receivedDateTime ?? null;

    const recoveryLink = linkMatch?.[1] ?? null;
    if (!recoveryLink || !receivedTime) return null;
    const time = new Date(receivedTime);
    this.logger.log(`Recovery link extracted successfully: ${recoveryLink}, time: ${time.getTime()} `);
    return { recoveryLink, time };
  }

  private extractSignInCode(emails: emailIntrospectionIndividualEmail[]): extractedSignInCode | null {
    const theMinorEmail = emails.sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime())[0];
    const codeMatch = theMinorEmail?.body.content.match(interceptorIdentifiers.signInCode.interceptorRegex);
    const receivedTime = theMinorEmail?.receivedDateTime ?? null;
    const signInCode = codeMatch?.[1] ?? null;

    if (!codeMatch || !receivedTime || !signInCode) return null;

    const time = new Date(receivedTime);
    this.logger.log(`Sign-in code extracted successfully: ${signInCode}, time: ${time.getTime()} `);
    return { signInCode, time };
  }

  private extractTemporalSignInCode(emails: emailIntrospectionIndividualEmail[]): extractedSignInLink | null {
    const theMinorEmail = emails.sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime())[0];
    const codeMatch = theMinorEmail?.body.content.match(interceptorIdentifiers.temporalSignIng.interceptorRegex);
    const receivedTime = theMinorEmail?.receivedDateTime ?? null;
    const temporalSignInLink = codeMatch?.[1] ?? null;

    if (!codeMatch || !receivedTime || !temporalSignInLink) return null;

    const time = new Date(receivedTime);
    this.logger.log(`Temporal Sign-in link extracted successfully: ${temporalSignInLink}, time: ${time.getTime()} `);
    return { temporalSignInLink, time };
  }
}
