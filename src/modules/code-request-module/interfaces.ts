export interface matchedEmailRow {
  email: string;
  refreshToken: string;
  accessToken: string;
}
export interface emailIntrospectionReseponse {
  value: emailIntrospectionIndividualEmail[];
}
export interface emailIntrospectionIndividualEmail {
  subject: string;
  from: { emailAddress: { name: string; address: string } };
  receivedDateTime: string;
  body: {
    contentType: string;
    content: string;
  };
}

export interface extractedRecoveryLink {
  recoveryLink: string;
  time: Date;
}

export interface extractedSignInCode {
  signInCode: string | null;
  time: Date;
}
