import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';

import { CodeRequestModule } from '~/modules/code-request-module/code-request.module';
import { OauthRegistryModule } from '~/modules/oauth-registry-artifact-module/oauth-registry-artifact.module';
import { DatabaseInterfaceModule } from '~/modules/sheet-azure-module/database-interface.module';
import { HttpExceptionFilter } from '~/shared/filters/http-exception.filter';
import { AuthGuard } from '~/shared/guards/auth.guard';
import { HttpModule } from '~/shared/http/http.module';

import { StorageModule } from './databaseSql/storage.module';
import { HealthCheckProbesModule } from './modules/health-check-probes-module/health-check-probes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseInterfaceModule,
    OauthRegistryModule,
    CodeRequestModule,
    HealthCheckProbesModule,
    HttpModule,
    StorageModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: false,
        transform: true,
        forbidNonWhitelisted: false,
        transformOptions: {
          enableImplicitConversion: false,
        },
      }),
    },
  ],
})
export class AppModule {}
