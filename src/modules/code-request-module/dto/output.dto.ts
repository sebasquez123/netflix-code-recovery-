import { extractedRecoveryLink, extractedSignInCode } from '../interfaces';

export class NetflixRequestOutputDto {
  extractedRecoveryLink!: extractedRecoveryLink | null;
  extractedSignInCode!: extractedSignInCode | null;
}
