import { Module } from '@nestjs/common';

import { StorageModule } from '~/databaseSql/storage.module';
import { LoggerService } from '~/logger';
import { HttpModule } from '~/shared/http/http.module';

import { SheetAzureModule } from '../sheet-azure-module/database-interface.module';

import { OauthRegistryController } from './oauth-registry-artifact.controller';
import { OauthRegistryService } from './oauth-registry-artifact.service';

@Module({
  controllers: [OauthRegistryController],
  providers: [OauthRegistryService, LoggerService],
  imports: [HttpModule, SheetAzureModule, StorageModule],
  exports: [OauthRegistryService],
})
export class OauthRegistryModule {}
