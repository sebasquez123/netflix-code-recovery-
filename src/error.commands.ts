const missingPermissions = 'Permissions required to access the resource. Gate token no valid or expired';
const missingAccessPermission = 'Access token for managing the portal is missing or expired';
const internalServerError = 'The server is off, or there is a problem internally or externally in regard with the service. the reason is unknown.';
const nofoundNetflixEmail =
  'No netflix email found for recovery link in the last 15 minutes, it often happens if the api does not accept the token or is malformed, it is fixed requesting again.';
const missingEmailRefreshTokenAfterRefresh =
  'Email access token not found after refresh, it may be the token is not valid anymore and need to be re authorized.';
const noDataFromEmailInbox = 'Failed to introspect email inbox, there was not valid type email data, if it was undefined coming from the attempts.';
const noCompleteOrUnexistentDataFromDatabase =
  'The email data from database is not complete or does not exist, there must be a problem with the db and the stored data, suggest to re authorize from the portal gate and download the dump of data and checkout what is existing there.';
const noEmailFoundInDatabase =
  'Failed to find email in database, ensure the email is properly registered and authorized. Server cache could have been rebooted.';
const noRelevantEmailsFound =
  'No relevant emails found in the inbox, it is because the sandbox is empty after applied the filters. there are no emails in the last 15 minutes, with no the right subject or no from netflix.';
interface ErrorMessageCodes {
  errorcode: string;
  realError: string;
  suggestion: string;
}
interface ErrorCodes<T> {
  MISSING_GATE_TOKEN: T;
  MISSING_PORTAL_ACCESS: T;
  INTERNAL_SERVER_ERROR: T;
  NO_FOUND_EMAIL_AVAILABLE: T;
  NO_DATA_COMPLETE_FROM_DB: T;
  MISSING_EMAIL_REFRESH_TOKEN_AFTER_REFRESH: T;
  NO_DATA_FROM_EMAIL_INBOX: T;
  NO_EMAIL_FOUND_IN_DB: T;
  NO_RELEVANT_EMAILS_FOUND: T;
}

export const errorCodes: ErrorCodes<ErrorMessageCodes> = {
  MISSING_GATE_TOKEN: {
    errorcode: 'STATUS 001',
    realError: missingPermissions,
    suggestion: 'Review the gate token used, type it correctly and submit in the path. if persists, request a review to support team.',
  },
  MISSING_PORTAL_ACCESS: {
    errorcode: 'STATUS 002',
    realError: missingAccessPermission,
    suggestion: 'Probably your portal token has expired already, it is programed for 25 minutes, you have to get into the gate again with a valid gate token.',
  },
  INTERNAL_SERVER_ERROR: {
    errorcode: 'STATUS 005',
    realError: internalServerError,
    suggestion:
      'Something is wrong internally, it is not behavioral by design. Try again in 5mn if the problem persists contact support team providing the error code.',
  },
  NO_EMAIL_FOUND_IN_DB: {
    errorcode: 'STATUS 5005',
    realError: noEmailFoundInDatabase,
    suggestion: 'Failed to find email in database, ensure the email is properly registered and authorized. Go the auth page and re authorize the email.',
  },
  NO_DATA_COMPLETE_FROM_DB: {
    errorcode: 'STATUS 5006',
    realError: noCompleteOrUnexistentDataFromDatabase,
    suggestion:
      'The data from database is not complete or does not exist, there must be a problem with the db and the stored data, suggest to re authorize from the portal gate and download the dump of data and checkout what is existing there.',
  },
  NO_FOUND_EMAIL_AVAILABLE: {
    errorcode: 'STATUS 5007',
    realError: nofoundNetflixEmail,
    suggestion:
      'Ensure the user has sent the code request sucessfuly and wait 3 minutes before trying again, therefore try again, sometimes it is because the api rejects the first time.',
  },
  MISSING_EMAIL_REFRESH_TOKEN_AFTER_REFRESH: {
    errorcode: 'STATUS 3011',
    realError: missingEmailRefreshTokenAfterRefresh,
    suggestion:
      'Email access token is missing after refresh, there must be a problem with the refres token, suggest to re authorize from the portal gate or introspect the manually the project if problem persists.',
  },
  NO_DATA_FROM_EMAIL_INBOX: {
    errorcode: 'STATUS 3012',
    realError: noDataFromEmailInbox,
    suggestion: 'Failed to introspect email inbox, ensure the email has permissions enabled. re authorize.',
  },
  NO_RELEVANT_EMAILS_FOUND: {
    errorcode: 'STATUS 3013',
    realError: noRelevantEmailsFound,
    suggestion:
      'Failed to find relevant email in inbox, ensure the email has received the link or code request and try again in a few minutes. if you prove that there is an email upon the sandbox and the problem persists, contact support.',
  },
};
