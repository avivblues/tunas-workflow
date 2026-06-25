import { createSign } from 'crypto';

export interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
}

export function parseServiceAccountJson(raw: string): GoogleServiceAccount {
  const parsed = JSON.parse(raw) as GoogleServiceAccount;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Invalid service account JSON: client_email and private_key required');
  }
  return parsed;
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

export async function getGoogleAccessToken(serviceAccount: GoogleServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );

  const signInput = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signInput);
  signer.end();

  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const signature = signer.sign(privateKey, 'base64url');
  const assertion = `${signInput}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const body = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error ?? 'Failed to obtain Google access token');
  }

  return body.access_token;
}
