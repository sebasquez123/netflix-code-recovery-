export interface ExcelRow extends Array<unknown> {
  0?: string;
}

export interface matchedEmailRow {
  email: string;
  refreshToken: string;
  accessToken: string;
  expires_in: number | string;
}
export interface emailIntrospectionReseponse {
  value: emailIntrospectionIndividualEmail[];
}
export interface emailIntrospectionIndividualEmail {
  subject: string;
  from: { emailAddress: { name: string; address: string } };
  receivedDateTime: string;
  bodyPreview: string;
}

export interface databaseTokenResponse {
  id: number;
  provider: string;
  userEmail: string;
  refreshToken: string;
  accessToken: string;
  expiresAt: Date | null;
  scope: string | null;
  createdAt: Date;
  updatedAt: Date;
}
