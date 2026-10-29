import type { AxiosInstance } from 'axios';
import { apiClient } from '../../../services/api/apiClient';
import { generateIdempotencyKey } from '../../../utils/idempotency';
import {
  beneficiariesResponseSchema,
  genericSuccessResponseSchema,
} from '../schemas/beneficiarySchemas';
import {
  requestStatusDetailResponseSchema,
  transferQuoteResponseSchema,
  transferRequestResponseSchema,
} from '../schemas/transferSchemas';
import type {
  AddBeneficiaryRequest,
  Beneficiary,
  RequestStatusDetailResponse,
  TransferKind,
  TransferQuoteResponse,
  TransferRequestResponse,
  TransferRequestSubmission,
} from '../types/transferTypes';

export function createTransfersApi(client: AxiosInstance = apiClient) {
  return {
    // --- Beneficiaries (Saved Withdrawal Numbers) ---

    /**
     * `GET /member/beneficiaries`
     * Fetches up to 3 saved payout numbers with usability status and 24h waiting period info.
     */
    async getBeneficiaries(): Promise<Beneficiary[]> {
      const response = await client.get('/member/beneficiaries');
      return beneficiariesResponseSchema.parse(response.data);
    },

    /**
     * `POST /member/beneficiaries/code`
     * Dispatches a 6-digit SMS verification code to the registered member phone.
     */
    async sendBeneficiaryOtp(): Promise<{ ok: boolean }> {
      const response = await client.post('/member/beneficiaries/code', {});
      return genericSuccessResponseSchema.parse(response.data);
    },

    /**
     * `POST /member/beneficiaries`
     * Saves a new withdrawal phone number. Requires the 6-digit OTP from SMS.
     */
    async addBeneficiary(payload: AddBeneficiaryRequest): Promise<void> {
      await client.post('/member/beneficiaries', payload);
    },

    /**
     * `DELETE /member/beneficiaries/{id}`
     * Removes a saved withdrawal number.
     */
    async deleteBeneficiary(id: string): Promise<{ ok: boolean }> {
      const response = await client.delete(`/member/beneficiaries/${id}`);
      return genericSuccessResponseSchema.parse(response.data);
    },

    // --- Money Requests & Internal Transfers ---

    /**
     * `GET /member/requests/quote?kind=&amount=`
     * Calculates fee and total taken from available savings before user confirmation.
     */
    async getQuote(params: {
      kind: TransferKind;
      amount?: number;
      shares?: number;
    }): Promise<TransferQuoteResponse> {
      const queryParams: Record<string, string | number> = {
        kind: params.kind,
      };
      if (params.amount) queryParams.amount = params.amount;
      if (params.shares) queryParams.shares = params.shares;

      const response = await client.get('/member/requests/quote', {
        params: queryParams,
      });
      return transferQuoteResponseSchema.parse(response.data);
    },

    /**
     * `POST /member/requests/code`
     * Sends a 6-digit SMS code to registered SIM when sms_code_needed is true.
     */
    async sendRequestOtp(payload: {
      kind: TransferKind;
      amount?: number;
    }): Promise<{ ok: boolean }> {
      const response = await client.post('/member/requests/code', payload);
      return genericSuccessResponseSchema.parse(response.data);
    },

    /**
     * `POST /member/requests`
     * Submits a withdrawal or transfer with re-entered password and required Idempotency-Key.
     */
    async submitRequest(
      payload: TransferRequestSubmission,
      customIdempotencyKey?: string,
    ): Promise<TransferRequestResponse> {
      const key = customIdempotencyKey || generateIdempotencyKey('req');
      const response = await client.post('/member/requests', payload, {
        idempotencyKey: key,
      });
      return transferRequestResponseSchema.parse(response.data);
    },

    /**
     * `GET /member/requests/{id}`
     * Polls the resolution of an in-flight transfer request (waiting_for_approval -> completed / rejected).
     */
    async getRequestStatus(id: string): Promise<RequestStatusDetailResponse> {
      const response = await client.get(`/member/requests/${id}`);
      return requestStatusDetailResponseSchema.parse(response.data);
    },
  };
}

export const transfersApi = createTransfersApi();

