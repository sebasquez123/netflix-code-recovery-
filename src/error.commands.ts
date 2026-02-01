const missingPermissions = 'Permissions required to access the resource. Gate token no valid or expired';
const missingAccessPermission = 'Access token for managing the portal is missing or expired';
const missingExcelToken = 'Excel access token is missing or expired, suggest to re authorize from the portal gate';
const missingMicrosoftToken = 'Microsoft access token for reading emails is missing or expired';
const internalServerError = 'The server is off, or there is a problem internally or externally in regard with the service. the reason is unknown.';
const nofoundNetflixEmail = 'No netflix email found for recovery link in the last 15 minutes.';

interface ErrorMessageCodes {
  errorcode: string;
  realError: string;
  suggestion: string;
}
interface ErrorCodes {
  MISSING_GATE_TOKEN: ErrorMessageCodes;
  MISSING_PORTAL_ACCESS: ErrorMessageCodes;
  MISSING_EXCEL_TOKEN: ErrorMessageCodes;
  MISSING_MICROSOFT_TOKEN: ErrorMessageCodes;
  INTERNAL_SERVER_ERROR: ErrorMessageCodes;
  NO_FOUND_EMAIL_AVAILABLE: ErrorMessageCodes;
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
  MISSING_EXCEL_TOKEN: {
    errorcode: 'CODE 003',
    realError: missingExcelToken,
    suggestion:
      'Re-authorize Excel access from the portal gate to obtain a new token, the token should be saved automatically, try to open the consent screen and select the correct profile.',
  },
  MISSING_MICROSOFT_TOKEN: {
    errorcode: 'CODE 004',
    realError: missingMicrosoftToken,
    suggestion:
      'Likely your account has expired and need to register it again, open the portal gate, register the email and the keys will be saved automatically at your excel sheet, never erase them.',
  },
  INTERNAL_SERVER_ERROR: {
    errorcode: 'CODE 005',
    realError: internalServerError,
    suggestion:
      'Something is wrong internally, it is not behavioral by design. Try again in 5mn if the problem persists contact support team providing the error code.',
  },
  NO_FOUND_EMAIL_AVAILABLE: {
    errorcode: 'CODE 006',
    realError: nofoundNetflixEmail,
    suggestion: 'Ensure the email is healthy, ensure the user has sent the code request sucessfuly and wait 3 minutes before trying again.',
  },
};
