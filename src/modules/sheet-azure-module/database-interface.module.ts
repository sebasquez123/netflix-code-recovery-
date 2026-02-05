import { Module } from '@nestjs/common';

import { StorageModule } from '~/databaseSql/storage.module';
import { HttpModule } from '~/shared/http/http.module';

import { DatabaseInterfaceController } from './database-interface.controller';
import { DatabaseInterfaceService } from './database-interface.service';

@Module({
  controllers: [DatabaseInterfaceController],
  providers: [DatabaseInterfaceService],
  imports: [HttpModule, StorageModule],
  exports: [DatabaseInterfaceService],
})
export class DatabaseInterfaceModule {}
