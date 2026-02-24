import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { StorageService } from './storage.service';

@Module({
  providers: [
    StorageService,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
