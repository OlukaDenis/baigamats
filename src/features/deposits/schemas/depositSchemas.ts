import { z } from 'zod';

export const depositQuoteResponseSchema = z.object({
  amount: z.number(),
  fee: z.number().default(0),
  total_to_pay: z.number(),
  min_deposit: z.number().default(500),
  max_deposit: z.number().default(5_000_000),
});

export const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(\+?256|0)?[37]\d{8}$/,
    'Enter a valid Ugandan mobile money phone number (e.g. 0772123456 or +256772123456)',
  )
  .transform(val => {
    // Normalise to 2567...
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      return `256${cleaned.slice(1)}`;
    }
    if (cleaned.startsWith('256')) {
      return cleaned;
    }
    return `256${cleaned}`;
  });

export const initiateDepositRequestSchema = z.object({
  amount: z.number().int().positive('Amount must be greater than zero'),
  phone: phoneSchema,
});

export const initiateDepositResponseSchema = z.object({
  id: z.string(),
  status: z.string().default('pending'),
  message: z.string().optional(),
});

export const depositStatusEnum = z.enum(['pending', 'success', 'failed']);

export const depositStatusResponseSchema = z.object({
  id: z.string().optional(),
  status: depositStatusEnum,
  message: z.string().nullable().optional(),
  amount: z.number().optional(),
});

