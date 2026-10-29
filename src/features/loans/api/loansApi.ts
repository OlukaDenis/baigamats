import type { AxiosInstance } from 'axios';
import { apiClient } from '../../../services/api/apiClient';
import { generateIdempotencyKey } from '../../../utils/idempotency';
import {
  genericSuccessResponseSchema,
} from '../../transfers/schemas/beneficiarySchemas';
import {
  transferQuoteResponseSchema,
} from '../../transfers/schemas/transferSchemas';
import type { TransferQuoteResponse } from '../../transfers/types/transferTypes';
import {
  loanDetailSchema,
  loanRepayResponseSchema,
  loansListResponseSchema,
} from '../schemas/loanSchemas';
import type {
  LoanDetail,
  LoanItem,
  LoanRepayRequest,
  LoanRepayResponse,
} from '../types/loanTypes';

export function createLoansApi(client: AxiosInstance = apiClient) {
  return {
    /**
     * `GET /member/loans`
     * Retrieves member's loans (active, overdue, closed) with balance due and schedules.
     */
    async getLoans(): Promise<LoanItem[]> {
      const response = await client.get('/member/loans');
      return loansListResponseSchema.parse(response.data);
    },

    /**
     * `GET /member/loans/{id}`
     * Fetches detailed loan information including historical repayments ledger.
     */
    async getLoanById(id: string): Promise<LoanDetail> {
      const response = await client.get(`/member/loans/${id}`);
      return loanDetailSchema.parse(response.data);
    },

    /**
     * `GET /member/requests/quote?kind=repay&amount=`
     * Calculates fee and whether SMS OTP is required for repaying a loan from savings.
     */
    async getRepayQuote(amount: number): Promise<TransferQuoteResponse> {
      const response = await client.get('/member/requests/quote', {
        params: { kind: 'repay', amount },
      });
      return transferQuoteResponseSchema.parse(response.data);
    },

    /**
     * `POST /member/requests/code`
     * Sends a 6-digit SMS code to registered SIM for loan repayment if required.
     */
    async sendRepayOtp(amount?: number): Promise<{ ok: boolean }> {
      const response = await client.post('/member/requests/code', {
        kind: 'repay',
        amount,
      });
      return genericSuccessResponseSchema.parse(response.data);
    },

    /**
     * `POST /member/loans/{id}/repay`
     * Repays loan from the member's available savings balance.
     * Enforces Idempotency-Key header to prevent duplicate repayments.
     */
    async repayLoan(
      loanId: string,
      payload: LoanRepayRequest,
      customIdempotencyKey?: string,
    ): Promise<LoanRepayResponse> {
      const key = customIdempotencyKey || generateIdempotencyKey('rep');
      const response = await client.post(`/member/loans/${loanId}/repay`, payload, {
        idempotencyKey: key,
      });
      return loanRepayResponseSchema.parse(response.data);
    },
  };
}

export const loansApi = createLoansApi();

