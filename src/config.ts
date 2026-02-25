import { readFileSync } from 'node:fs';
import path from 'node:path';

import { config, parse } from 'dotenv';
import type { Level } from 'pino';

// eslint-disable-next-line unicorn/prefer-module
config({ path: path.join(__dirname, '..', '.env') });
// eslint-disable-next-line unicorn/prefer-module
const missedEnvironmentVariables = Object.keys(parse(readFileSync(path.join(__dirname, '..', '.env.example')))).filter(
  (exampleKey) => !process.env[exampleKey]
);
if (missedEnvironmentVariables.length > 0) throw new Error(`${missedEnvironmentVariables.join(', ')} not configured`);

export default {
  app: {
    port: Number.parseInt(process.env['APP_PORT'] ?? '3035'),
    appUrl: process.env['APP_URL']!,
    apiUrl: process.env['API_URL']!,
    artifactKey: process.env['ARTIFACT_KEY']!,
    sessionSignature: process.env['SESSION_SIGNATURE']!,
    gateSignature: process.env['GATE_SIGNATURE']!,
  },
  log: {
    level: process.env['LOG_LEVEL']! as Level,
    isPrettyFormat: process.stdout.isTTY,
  },
  azure: {
    clientId: process.env['AZURE_CLIENT_ID']!,
    clientSecret: process.env['AZURE_CLIENT_SECRET']!,
    userEmail: process.env['AZURE_USER_EMAIL']!,
    maxReadNetflixEmails: Number.parseInt(process.env['MAX_READ_NETFLIX_EMAILS']!),
  },
} as const;
