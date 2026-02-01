import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { LoggerService } from '~/logger';

import { HealthCheckProbesController } from './health-check-probes.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthCheckProbesController],
  providers: [LoggerService],
})
export class HealthCheckProbesModule {}
