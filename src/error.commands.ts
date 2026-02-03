const missingPermissions = 'Permissions required to access the resource. Gate token no valid or expired';
const missingAccessPermission = 'Access token for managing the portal is missing or expired';
const internalServerError = 'The server is off, or there is a problem internally or externally in regard with the service. the reason is unknown.';
const nofoundNetflixEmail = 'No netflix email found for recovery link in the last 15 minutes.';
const missingExcelTokenInDatabase = 'Excel access token not found at DB, maybe the DB was rebooted or cleaned suddenly';
const noExcelTokenFoundAfterRefresh = 'Excel access token not found after refresh, it may be the token is not valid anymore and need to be re authorized.';
const noDataFoundInExcel = 'No Excel row found after attempts for the configured user, it might have failed in the attempts to read the excel.';
const noDataCompleteFoundFromExcel = 'Microsoft access token or refresh token not found in the excel, information is incomplete.';
const missingEmailRefreshTokenAfterRefresh =
  'Email access token not found after refresh, it may be the token is not valid anymore and need to be re authorized.';
const noDataFromEmailInbox = 'Failed to introspect email inbox, there was not valid type email data, if it was undefined coming from the attempts.';
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

  MISSING_EXCEL_TOKEN: ErrorMessageCodes;
  NO_EXCEL_TOKEN_AFTER_REFRESH: ErrorMessageCodes;
  NO_DATA_FOUND_IN_EXCEL: ErrorMessageCodes;
  NO_DATA_COMPLETE_FOUND_FROM_EXCEL: ErrorMessageCodes;
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
  NO_FOUND_EMAIL_AVAILABLE: {
    errorcode: 'CODE 3007',
    realError: nofoundNetflixEmail,
    suggestion: 'Ensure the email is healthy, ensure the user has sent the code request sucessfuly and wait 3 minutes before trying again.',
  },

  MISSING_EXCEL_TOKEN: {
    errorcode: 'CODE 1007',
    realError: missingExcelTokenInDatabase,
    suggestion: 'Excel token is missing or expired, suggest to re authorize from the portal gate.',
  },
  NO_EXCEL_TOKEN_AFTER_REFRESH: {
    errorcode: 'CODE 1008',
    realError: noExcelTokenFoundAfterRefresh,
    suggestion:
      'Excel token is missing after refresh, the db was cleaned, suggest to re authorize from the portal gate or introspect the dd if problem persists.',
  },
  NO_DATA_FOUND_IN_EXCEL: {
    errorcode: 'CODE 2009',
    realError: noDataFoundInExcel,
    suggestion: 'No Excel row found for the configured user, recommended reauth the excel again, but observe the data is correctly inserted.',
  },
  NO_DATA_COMPLETE_FOUND_FROM_EXCEL: {
    errorcode: 'CODE 2010',
    realError: noDataCompleteFoundFromExcel,
    suggestion:
      'Microsoft access token or refresh token not found in the excel, suggest to re authorize, and make sure the data exist complete ( email, refresh, access, expire time )',
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
