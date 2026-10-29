import { z } from 'zod';
import { phoneSchema } from '../../deposits/schemas/depositSchemas';

export const beneficiarySchema = z.object({
  id: z.string(),
  label: z.string().nullable().optional(),
  phone_masked: z.string(),
  usable: z.boolean().default(false),
  usable_from: z.string().nullable().optional(),
});

export const beneficiariesResponseSchema = z.array(beneficiarySchema);

export const addBeneficiaryRequestSchema = z.object({
  phone: phoneSchema,
  label: z.string().trim().max(30).optional(),
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit SMS verification code'),
});

export const addBeneficiaryResponseSchema = beneficiarySchema.or(
  z.object({
    id: z.string(),
    ok: z.boolean().optional(),
  }),
);

export const genericSuccessResponseSchema = z.object({
  ok: z.boolean(),
});

