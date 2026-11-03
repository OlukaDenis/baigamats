import { z } from 'zod';

export const memberSessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.string().default('bearer'),
  expires_in: z.number().int().optional(),
  expires_at: z.number().int().nullable().optional(),
});

export const memberInfoSchema = z
  .object({
    id: z.string().optional(),
    name: z.string(),
    member_no: z.string(),
    phone: z.string(),
    email: z.string().nullable().optional(),
  })
  .passthrough();

export const organizationInfoSchema = z
  .object({
    id: z.string().optional(),
    name: z.string(),
    slug: z.string().optional(),
  })
  .passthrough();

export const memberPinSchema = z
  .string()
  .trim()
  .regex(/^\d{4,5}$/, 'PIN must be 4 or 5 digits');

export const memberLoginRequestSchema = z.object({
  org: z.string().trim().min(1, 'Cooperative code or address name is required'),
  member_no: z.string().trim().min(1, 'Member number or phone is required'),
  password: memberPinSchema,
  device_id: z.string().optional(),
});

export const memberLoginResponseSchema = z.object({
  session: memberSessionSchema,
  must_change_password: z.boolean().optional(),
  member: memberInfoSchema,
  organization: organizationInfoSchema,
});

export const memberRefreshRequestSchema = z.object({
  refresh_token: z.string().min(1),
});

export const memberRefreshResponseSchema = z.object({
  session: memberSessionSchema,
});

export const memberChangePasswordRequestSchema = z.object({
  current: z.string().optional(),
  next: memberPinSchema,
});

export const memberChangePasswordResponseSchema = z.object({
  ok: z.boolean(),
});

export const memberLogoutResponseSchema = z.object({
  ok: z.boolean(),
});

export const persistedMemberAuthSessionSchema = z.object({
  type: z.literal('member').default('member'),
  session: memberSessionSchema,
  mustChangePassword: z.boolean().default(false),
  member: memberInfoSchema,
  organization: organizationInfoSchema,
});

