import type { z } from 'zod';
import type {
  memberChangePasswordRequestSchema,
  memberChangePasswordResponseSchema,
  memberInfoSchema,
  memberLoginRequestSchema,
  memberLoginResponseSchema,
  memberLogoutResponseSchema,
  memberRefreshRequestSchema,
  memberRefreshResponseSchema,
  memberSessionSchema,
  organizationInfoSchema,
  persistedMemberAuthSessionSchema,
} from '../schemas/memberAuthSchemas';

export type MemberSession = z.infer<typeof memberSessionSchema>;
export type MemberInfo = z.infer<typeof memberInfoSchema>;
export type OrganizationInfo = z.infer<typeof organizationInfoSchema>;

export type MemberLoginRequest = z.infer<typeof memberLoginRequestSchema>;
export type MemberLoginResponse = z.infer<typeof memberLoginResponseSchema>;

export type MemberRefreshRequest = z.infer<typeof memberRefreshRequestSchema>;
export type MemberRefreshResponse = z.infer<typeof memberRefreshResponseSchema>;

export type MemberChangePasswordRequest = z.infer<typeof memberChangePasswordRequestSchema>;
export type MemberChangePasswordResponse = z.infer<typeof memberChangePasswordResponseSchema>;

export type MemberLogoutResponse = z.infer<typeof memberLogoutResponseSchema>;
export type PersistedMemberAuthSession = z.infer<typeof persistedMemberAuthSessionSchema>;

