import { Module } from '@nestjs/common';

import { LoggerService } from '~/logger';
import { HttpModule } from '~/shared/http/http.module';

import { SheetAzureService } from './sheet-azure.service';

@Module({
  providers: [SheetAzureService, LoggerService],
  imports: [HttpModule],
  exports: [SheetAzureService],
})
export class SheetAzureModule {}
