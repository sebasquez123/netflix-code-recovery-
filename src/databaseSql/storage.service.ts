import { Injectable } from '@nestjs/common';

import { PrismaService } from '~/databaseSql/prisma.service';
import { databaseGetResponse } from '~/modules/sheet-azure-module/interfaces';

export interface UpsertExcelTokenParameters {
  userEmail: string;
  refreshToken: string;
  accessToken?: string;
  expiresAt?: Date;
  scope?: string;
}

@Injectable()
export class StorageService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertEmailData(parameters: UpsertExcelTokenParameters): Promise<void> {
    const { userEmail, refreshToken, accessToken } = parameters;

    if (refreshToken == undefined) throw new Error('Refresh token is required');
    if (accessToken == undefined) throw new Error('AccessToken is required');
    if (userEmail == undefined) throw new Error('UserEmail is required');

    await this.prisma.emails.upsert({
      where: {
        provider_userEmail: {
          provider: 'microsoft-email',
          userEmail,
        },
      },
      update: {
        refreshToken,
        accessToken,
      },
      create: {
        provider: 'microsoft-email',
        userEmail,
        refreshToken,
        accessToken,
      },
    });
  }

  async getEmailData(userEmail: string): Promise<databaseGetResponse | null> {
    return await this.prisma.emails.findUnique({
      where: {
        provider_userEmail: {
          provider: 'microsoft-email',
          userEmail,
        },
      },
    });
  }

  async getAllEmailsData(): Promise<databaseGetResponse[]> {
    return await this.prisma.emails.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      where: {
        provider: 'microsoft-email',
      },
    });
  }
}
