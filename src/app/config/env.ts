import { z } from 'zod';

export const appEnvSchema = z.enum(['development', 'staging', 'production']);
export type AppEnv = z.infer<typeof appEnvSchema>;

export const envSchema = z.object({
  APP_ENV: appEnvSchema.default('development'),
  API_BASE_URL: z
    .string()
    .url('API_BASE_URL must be a valid URL')
    .refine(
      url => url.startsWith('https://') || url.startsWith('http://localhost') || url.startsWith('http://10.0.2.2'),
      'API_BASE_URL must use HTTPS in non-local environments',
    )
    .default('https://business.baigamats.com/api/v1'),
  API_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(120_000)
    .default(15_000),
});

export type EnvConfig = z.infer<typeof envSchema>;

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

/**
 * Parses and validates raw environment input against `envSchema`.
 * Exported as a pure function so unit tests can verify edge cases.
 */
export function parseEnv(rawEnv?: Record<string, string | undefined>): EnvConfig {
  const source = rawEnv ?? (typeof process !== 'undefined' ? process?.env : undefined) ?? {};
  return envSchema.parse({
    APP_ENV: source.APP_ENV || undefined,
    API_BASE_URL: source.API_BASE_URL || undefined,
    API_TIMEOUT_MS: source.API_TIMEOUT_MS || undefined,
  });
}

export const env: EnvConfig = parseEnv();
