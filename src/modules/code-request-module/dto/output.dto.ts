import { extractedActualizarHogarLink, extractedSignInCode, extractedSignInLink } from '../interfaces';

export class NetflixRequestOutputDto {
  extractedActualizarHogarLink!: extractedActualizarHogarLink | null;
  extractedSignInCode!: extractedSignInCode | null;
  extractedTemporalSignInLink!: extractedSignInLink | null;
}
