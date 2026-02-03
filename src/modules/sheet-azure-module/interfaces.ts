export interface readRangeInput {
  accessToken: string;
  address?: string;
}

export interface writeRangeInput {
  accessToken: string;
  address: string;
  values: unknown[][];
}

export interface MicrosoftTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number | string;
  refresh_token: string;
  scope: string;
  ext_expires_in: number | string;
}
