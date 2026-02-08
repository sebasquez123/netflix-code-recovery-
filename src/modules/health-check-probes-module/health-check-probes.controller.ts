import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthCheckResult } from '@nestjs/terminus';

import { LoggerService } from '~/logger';
import { Public } from '~/shared/decorators/public';

@Controller()
@Public()
export class HealthCheckProbesController {
  constructor(
    private readonly logger: LoggerService,
    private health: HealthCheckService
  ) {}

  @Get('/liveness-probe')
  @HealthCheck()
  async startupProbe(): Promise<HealthCheckResult> {
    const result = await this.health.check([]);
    this.logger.log(
      JSON.stringify({
        status: result.status,
        details: result.info,
        error: result.error,
        info: result.info,
      })
    );
    return result;
  }
}
