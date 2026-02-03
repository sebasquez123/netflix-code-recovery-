import { BadRequestException, Body, Controller, Param, Post } from '@nestjs/common';

import { LoggerService } from '~/logger';
import { Public } from '~/shared/decorators/public';

import { CodeRequestService } from './code-request.service';
import { EmailCaptureDto, linkZodVerification } from './dto/input.dto';
import { CodeRequestOutputDto } from './dto/output.dto';

@Controller('netflix')
export class CodeRequestController {
  private logger;
  constructor(private readonly codeRequestService: CodeRequestService) {
    this.logger = new LoggerService();
  }
  @Public()
  @Post('capture')
  async introspectEmail(@Body() email: EmailCaptureDto): Promise<CodeRequestOutputDto> {
    try {
      const result = await this.codeRequestService.azureEmailIntrospection(email);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw error;
    }
  }

  @Public()
  @Post('restoration/:recoverLink')
  async executeLink(@Param('recoverLink') recoverLink: string): Promise<void> {
    try {
      const result = linkZodVerification.safeParse({ recoverLink });
      if (result?.error) throw new BadRequestException('Invalid recoverLink URL');
      await this.codeRequestService.netflixLinkRestoration(recoverLink);
      return;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw error;
    }
  }
}
