import { z } from 'zod';

export const appEnvSchema = z.enum(['development', 'staging', 'production']);
export type AppEnv = z.infer<typeof appEnvSchema>;

export const appVariantSchema = z.enum(['sacco', 'horeca']);
export type AppVariant = z.infer<typeof appVariantSchema>;

export const envSchema = z.object({
  APP_ENV: appEnvSchema.default('development'),
  APP_VARIANT: appVariantSchema.default('sacco'),
  API_BASE_URL: z
    .string()
    .url('API_BASE_URL must be a valid URL')
    .refine(
      url => url.startsWith('https://') || url.startsWith('http://localhost') || url.startsWith('http://10.0.2.2'),
      'API_BASE_URL must use HTTPS in non-local environments',
    )
    .default('https://business.baigamats.com/api/v1'),
  HORECA_API_BASE_URL: z
    .string()
    .url('HORECA_API_BASE_URL must be a valid URL')
    .refine(
      url => url.startsWith('https://') || url.startsWith('http://localhost') || url.startsWith('http://10.0.2.2'),
      'HORECA_API_BASE_URL must use HTTPS in non-local environments',
    )
    .default('https://urchin-app-w43e8.ondigitalocean.app'),
  API_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(120_000)
    .default(15_000),
  ENABLE_MOCK: z
    .union([z.boolean(), z.string()])
    .transform(val => {
      if (typeof val === 'boolean') return val;
      return val.toLowerCase() === 'true' || val === '1';
    })
    .default(false),
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
  const source = rawEnv ?? {
    APP_ENV: typeof process !== 'undefined' ? process?.env?.APP_ENV : undefined,
    APP_VARIANT: typeof process !== 'undefined' ? process?.env?.APP_VARIANT : undefined,
    API_BASE_URL: typeof process !== 'undefined' ? process?.env?.API_BASE_URL : undefined,
    HORECA_API_BASE_URL: typeof process !== 'undefined' ? process?.env?.HORECA_API_BASE_URL : undefined,
    API_TIMEOUT_MS: typeof process !== 'undefined' ? process?.env?.API_TIMEOUT_MS : undefined,
    ENABLE_MOCK: typeof process !== 'undefined' ? process?.env?.ENABLE_MOCK : undefined,
  };
  return envSchema.parse({
    APP_ENV: source.APP_ENV || undefined,
    APP_VARIANT: source.APP_VARIANT || undefined,
    API_BASE_URL: source.API_BASE_URL || undefined,
    HORECA_API_BASE_URL: source.HORECA_API_BASE_URL || undefined,
    API_TIMEOUT_MS: source.API_TIMEOUT_MS || undefined,
    ENABLE_MOCK: source.ENABLE_MOCK !== undefined ? source.ENABLE_MOCK : undefined,
  });
}

export const env: EnvConfig = parseEnv();
