import type { z } from 'zod';
import type {
  addBeneficiaryRequestSchema,
  beneficiarySchema,
} from '../schemas/beneficiarySchemas';
import type {
  requestStatusDetailResponseSchema,
  transferKindEnum,
  transferQuoteResponseSchema,
  transferRequestResponseSchema,
  transferRequestStatusEnum,
  transferRequestSubmissionSchema,
} from '../schemas/transferSchemas';

export type Beneficiary = z.infer<typeof beneficiarySchema>;
export type AddBeneficiaryRequest = z.infer<typeof addBeneficiaryRequestSchema>;

export type TransferKind = z.infer<typeof transferKindEnum>;
export type TransferQuoteResponse = z.infer<typeof transferQuoteResponseSchema>;
export type TransferRequestSubmission = z.infer<typeof transferRequestSubmissionSchema>;
export type TransferRequestStatus = z.infer<typeof transferRequestStatusEnum>;
export type TransferRequestResponse = z.infer<typeof transferRequestResponseSchema>;
export type RequestStatusDetailResponse = z.infer<typeof requestStatusDetailResponseSchema>;

