import { Module } from '@nestjs/common';

import { PrismaService } from '~/databaseSql/prisma.service';

import { StorageService } from './storage.service';

@Module({
  providers: [PrismaService, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
