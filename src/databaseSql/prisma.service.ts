import path from 'node:path';

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const databasePath = path.resolve(process.cwd(), 'data/app.db');

    const adapter = new PrismaBetterSqlite3({
      url: `file:${databasePath}`,
    });

    super({
      adapter,
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
