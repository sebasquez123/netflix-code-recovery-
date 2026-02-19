import { IsNotEmpty, IsString } from 'class-validator';

export class EmailCaptureDto {
  @IsString()
  @IsNotEmpty()
  email!: string;
}
