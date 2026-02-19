import { Body, Controller, Post } from '@nestjs/common';

import { LoggerService } from '~/logger';
import { Public } from '~/shared/decorators/public';

import { CodeRequestService } from './code-request.service';
import { EmailCaptureDto } from './dto/input.dto';
import { NetflixRequestOutputDto } from './dto/output.dto';

@Controller('netflix')
export class CodeRequestController {
  private logger;
  constructor(private readonly codeRequestService: CodeRequestService) {
    this.logger = new LoggerService();
  }
  @Public()
  @Post('capture')
  async introspectEmail(@Body() email: EmailCaptureDto): Promise<NetflixRequestOutputDto> {
    try {
      const result = await this.codeRequestService.azureEmailIntrospection(email);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw error;
    }
  }
}
