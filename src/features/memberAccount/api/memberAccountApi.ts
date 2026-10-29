import type { AxiosInstance } from 'axios';
import { apiClient } from '../../../services/api/apiClient';
import {
  memberMeResponseSchema,
  memberTransactionsResponseSchema,
} from '../schemas/memberAccountSchemas';
import type {
  MemberMeResponse,
  MemberTransactionsResponse,
  TransactionFilter,
} from '../types/memberAccountTypes';

export function createMemberAccountApi(client: AxiosInstance = apiClient) {
  return {
    /**
     * `GET /member/me`
     * Fetches current member identity, organization, and all financial balances.
     */
    async getMe(): Promise<MemberMeResponse> {
      const response = await client.get('/member/me');
      return memberMeResponseSchema.parse(response.data);
    },

    /**
     * `GET /member/transactions`
     * Fetches the member's financial statement, newest first.
     * Supports limit (up to 100), offset, from (YYYY-MM-DD), and to (YYYY-MM-DD).
     */
    async getTransactions(
      filters?: Partial<TransactionFilter>,
    ): Promise<MemberTransactionsResponse> {
      const params: Record<string, string | number> = {};
      if (filters?.limit) params.limit = filters.limit;
      if (filters?.offset !== undefined) params.offset = filters.offset;
      if (filters?.from) params.from = filters.from;
      if (filters?.to) params.to = filters.to;

      const response = await client.get('/member/transactions', { params });
      return memberTransactionsResponseSchema.parse(response.data);
    },
  };
}

export const memberAccountApi = createMemberAccountApi();

