import { SetMetadata } from '@nestjs/common';

export const isPublicSymbol = Symbol('isPublic');

export function Public() {
  return SetMetadata(isPublicSymbol, true);
}
