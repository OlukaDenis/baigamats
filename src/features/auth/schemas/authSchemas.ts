import { z } from 'zod';

/** Standardized API error payload from docs/api-docs.json: `{ error: { code, message } }`. */
export const apiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().optional(),
    message: z.string().optional(),
  }),
});

export const sessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.string().default('bearer'),
  expires_in: z.number().int().optional(),
  expires_at: z.number().int().nullable().optional(),
});

export const mfaSessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

export const authUserSchema = z
  .object({
    id: z.string().optional(),
    email: z.string().nullable().optional(),
  })
  .loose();

export const authProfileSchema = z
  .object({
    organization_id: z.string().optional(),
    role: z.string().optional(),
  })
  .loose()
  .nullable();

export const loginRequestSchema = z.object({
  login_id: z.string().trim().min(1, 'Email or staff username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const loginMfaChallengeSchema = z.object({
  mfa_required: z.literal(true),
  factor_id: z.string().min(1),
  mfa_session: mfaSessionSchema,
});

export const loginSuccessSchema = z.object({
  mfa_required: z.literal(false).optional(),
  session: sessionSchema,
  user: authUserSchema.optional(),
  profile: authProfileSchema.optional(),
  needs_organization_setup: z.boolean().optional(),
});

export const loginResponseSchema = z.union([
  loginMfaChallengeSchema,
  loginSuccessSchema,
]);

export const mfaCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit authenticator code');

export const mfaVerifyRequestSchema = z.object({
  factor_id: z.string().min(1),
  code: mfaCodeSchema,
  mfa_session: mfaSessionSchema,
});

export const mfaVerifyResponseSchema = z.object({
  session: sessionSchema,
  user: authUserSchema.optional(),
  profile: authProfileSchema.optional(),
  needs_organization_setup: z.boolean().optional(),
});

export const refreshRequestSchema = z.object({
  refresh_token: z.string().min(1),
});

export const refreshResponseSchema = z.object({
  session: sessionSchema,
});

export const logoutScopeSchema = z.enum(['local', 'global', 'others']);

export const logoutRequestSchema = z
  .object({
    scope: logoutScopeSchema.optional(),
  })
  .optional();

export const logoutResponseSchema = z.object({
  ok: z.boolean(),
});

export const registerRequestSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerResponseSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
});

export const persistedAuthSessionSchema = z.object({
  session: sessionSchema,
  user: authUserSchema.nullable().default(null),
  profile: authProfileSchema.default(null),
  needsOrganizationSetup: z.boolean().default(false),
});

export const businessSchema = z
  .object({
    name: z.string(),
    legal_name: z.string().optional(),
    institution_code: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    logo_url: z.string().nullable().optional(),
    currency: z.string().optional(),
  })
  .loose();

export const businessResponseSchema = z.object({
  data: businessSchema,
});
