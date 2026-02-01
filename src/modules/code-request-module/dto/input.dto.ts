import { IsEmail } from 'class-validator';
import { z } from 'zod';

export const linkZodVerification = z.object({
  recoverLink: z.url({ message: 'Invalid recoverLink URL' }).min(1, { message: 'recoverLink field is required' }),
});

export class EmailCaptureDto {
  @IsEmail()
  email!: string;
}
