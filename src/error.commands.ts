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
interface ErrorMessageCodes {
  errorcode: string;
  realError: string;
  suggestion: string;
}
interface ErrorCodes {
  MISSING_GATE_TOKEN: ErrorMessageCodes;
  MISSING_PORTAL_ACCESS: ErrorMessageCodes;
  INTERNAL_SERVER_ERROR: ErrorMessageCodes;
  NO_FOUND_EMAIL_AVAILABLE: ErrorMessageCodes;
  NO_DATA_COMPLETE_FROM_DB: ErrorMessageCodes;
  MISSING_EMAIL_REFRESH_TOKEN_AFTER_REFRESH: ErrorMessageCodes;
  NO_DATA_FROM_EMAIL_INBOX: ErrorMessageCodes;
}

export const errorCodes: ErrorCodes = {
  MISSING_GATE_TOKEN: {
    errorcode: 'CODE 001',
    realError: missingPermissions,
    suggestion: 'Review the gate token used, type it correctly and submit in the path. if persists, request a review to support team.',
  },
  MISSING_PORTAL_ACCESS: {
    errorcode: 'CODE 002',
    realError: missingAccessPermission,
    suggestion: 'Probably your portal token has expired already, it is programed for 25 minutes, you have to get into the gate again with a valid gate token.',
  },
  INTERNAL_SERVER_ERROR: {
    errorcode: 'CODE 005',
    realError: internalServerError,
    suggestion:
      'Something is wrong internally, it is not behavioral by design. Try again in 5mn if the problem persists contact support team providing the error code.',
  },
  NO_DATA_COMPLETE_FROM_DB: {
    errorcode: 'CODE 5006',
    realError: noCompleteOrUnexistentDataFromDatabase,
    suggestion:
      'The data from database is not complete or does not exist, there must be a problem with the db and the stored data, suggest to re authorize from the portal gate and download the dump of data and checkout what is existing there.',
  },
  NO_FOUND_EMAIL_AVAILABLE: {
    errorcode: 'CODE 5007',
    realError: nofoundNetflixEmail,
    suggestion:
      'Ensure the user has sent the code request sucessfuly and wait 3 minutes before trying again, therefore try again, sometimes it is because the api rejects the first time.',
  },
  MISSING_EMAIL_REFRESH_TOKEN_AFTER_REFRESH: {
    errorcode: 'CODE 3011',
    realError: missingEmailRefreshTokenAfterRefresh,
    suggestion:
      'Email access token is missing after refresh, there must be a problem with the refres token, suggest to re authorize from the portal gate or introspect the manually the project if problem persists.',
  },
  NO_DATA_FROM_EMAIL_INBOX: {
    errorcode: 'CODE 3012',
    realError: noDataFromEmailInbox,
    suggestion: 'Failed to introspect email inbox, ensure the email has permissions enabled. re authorize.',
  },
};
