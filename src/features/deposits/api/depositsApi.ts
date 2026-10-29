import type { AxiosInstance } from 'axios';
import { apiClient } from '../../../services/api/apiClient';
import { generateIdempotencyKey } from '../../../utils/idempotency';
import {
  depositQuoteResponseSchema,
  depositStatusResponseSchema,
  initiateDepositResponseSchema,
} from '../schemas/depositSchemas';
import type {
  DepositQuoteResponse,
  DepositStatusResponse,
  InitiateDepositRequest,
  InitiateDepositResponse,
} from '../types/depositTypes';

export function createDepositsApi(client: AxiosInstance = apiClient) {
  return {
    /**
     * `GET /member/deposits/quote?amount=`
     * Calculates fee and total to pay for a planned mobile money deposit.
     */
    async getQuote(amount: number): Promise<DepositQuoteResponse> {
      const response = await client.get('/member/deposits/quote', {
        params: { amount },
      });
      return depositQuoteResponseSchema.parse(response.data);
    },

    /**
     * `POST /member/deposits`
     * Triggers USSD / STK push payment prompt to the member's mobile phone.
     * Enforces Idempotency-Key header to prevent duplicate charge requests.
     */
    async initiateDeposit(
      payload: InitiateDepositRequest,
      customIdempotencyKey?: string,
    ): Promise<InitiateDepositResponse> {
      const key = customIdempotencyKey || generateIdempotencyKey('dep');
      const response = await client.post('/member/deposits', payload, {
        idempotencyKey: key,
      });
      return initiateDepositResponseSchema.parse(response.data);
    },

    /**
     * `GET /member/deposits/{id}`
     * Polls the live status of an initiated mobile money deposit.
     * Terminal statuses: `success` or `failed`.
     */
    async getStatus(depositId: string): Promise<DepositStatusResponse> {
      const response = await client.get(`/member/deposits/${depositId}`);
      return depositStatusResponseSchema.parse(response.data);
    },
  };
}

export const depositsApi = createDepositsApi();

