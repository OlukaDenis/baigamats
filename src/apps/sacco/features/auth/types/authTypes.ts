import type { z } from 'zod';

import type {
  authProfileSchema,
  authUserSchema,
  businessResponseSchema,
  businessSchema,
  loginMfaChallengeSchema,
  loginRequestSchema,
  loginResponseSchema,
  loginSuccessSchema,
  logoutRequestSchema,
  logoutResponseSchema,
  logoutScopeSchema,
  mfaSessionSchema,
  mfaVerifyRequestSchema,
  mfaVerifyResponseSchema,
  persistedAuthSessionSchema,
  refreshRequestSchema,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  sessionSchema,
} from '../schemas/authSchemas';

export type AuthSession = z.infer<typeof sessionSchema>;
export type MfaSession = z.infer<typeof mfaSessionSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthProfile = z.infer<typeof authProfileSchema>;

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginMfaChallenge = z.infer<typeof loginMfaChallengeSchema>;
export type LoginSuccess = z.infer<typeof loginSuccessSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export type MfaVerifyRequest = z.infer<typeof mfaVerifyRequestSchema>;
export type MfaVerifyResponse = z.infer<typeof mfaVerifyResponseSchema>;

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export type LogoutScope = z.infer<typeof logoutScopeSchema>;
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export type PersistedAuthSession = z.infer<typeof persistedAuthSessionSchema>;

export type Business = z.infer<typeof businessSchema>;
export type BusinessResponse = z.infer<typeof businessResponseSchema>;
