import { Controller, Get, Header, StreamableFile } from '@nestjs/common';

import { DatabaseInterfaceService } from './database-interface.service';

@Controller('database')
export class DatabaseInterfaceController {
  constructor(private readonly databaseService: DatabaseInterfaceService) {}

  @Get('download-excel')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="email-data-export.xlsx"')
  async downloadExcel(): Promise<StreamableFile> {
    const buffer = await this.databaseService.downloadExcelReport();
    return new StreamableFile(buffer);
  }
}
