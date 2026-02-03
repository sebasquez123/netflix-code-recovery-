import { Module } from '@nestjs/common';

import { StorageModule } from '~/databaseSql/storage.module';
import { LoggerService } from '~/logger';
import { HttpModule } from '~/shared/http/http.module';

import { OauthRegistryModule } from '../oauth-registry-artifact-module/oauth-registry-artifact.module';
import { SheetAzureModule } from '../sheet-azure-module/sheet-azure.module';

import { CodeRequestController } from './code-request.controller';
import { CodeRequestService } from './code-request.service';

@Module({
  controllers: [CodeRequestController],
  providers: [CodeRequestService, LoggerService],
  imports: [HttpModule, OauthRegistryModule, SheetAzureModule, StorageModule],
  exports: [CodeRequestService],
})
export class CodeRequestModule {}
