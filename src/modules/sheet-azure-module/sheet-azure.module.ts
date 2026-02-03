import { Module } from '@nestjs/common';

import { StorageModule } from '~/databaseSql/storage.module';
import { HttpModule } from '~/shared/http/http.module';

import { SheetAzureService } from './sheet-azure.service';

@Module({
  providers: [SheetAzureService],
  imports: [HttpModule, StorageModule],
  exports: [SheetAzureService],
})
export class SheetAzureModule {}
