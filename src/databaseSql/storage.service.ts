import { Injectable } from '@nestjs/common';

import { PrismaService } from '~/databaseSql/prisma.service';

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

  async upsertExcelToken(parameters: UpsertExcelTokenParameters): Promise<void> {
    const { userEmail, refreshToken, accessToken, scope, expiresAt } = parameters;

    if (refreshToken == undefined) throw new Error('Refresh token is required');
    if (scope == undefined) throw new Error('Scope is required');
    if (expiresAt == undefined) throw new Error('ExpiresAt is required');
    if (accessToken == undefined) throw new Error('AccessToken is required');
    if (userEmail == undefined) throw new Error('UserEmail is required');

    await this.prisma.oAuthToken.upsert({
      where: {
        provider_userEmail: {
          provider: 'excel',
          userEmail,
        },
      },
      update: {
        refreshToken,
        scope,
        expiresAt,
        accessToken,
      },
      create: {
        provider: 'excel',
        userEmail,
        refreshToken,
        accessToken,
        scope,
        expiresAt,
      },
    });
  }

  async getExcelToken(userEmail: string) {
    return await this.prisma.oAuthToken.findUnique({
      where: {
        provider_userEmail: {
          provider: 'excel',
          userEmail,
        },
      },
    });
  }
}
