import { ConfigService } from '@nestjs/config';

const INSECURE_DEFAULTS = new Set(['supersecret']);

export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  if (INSECURE_DEFAULTS.has(secret)) {
    throw new Error('JWT_SECRET must not use an insecure default value');
  }

  return secret;
}
