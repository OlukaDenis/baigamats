import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { memberAccountKeys } from '../../memberAccount/hooks/useMemberAccountQueries';
import type { TransferQuoteResponse } from '../../transfers/types/transferTypes';
import { loansApi } from '../api/loansApi';
import type {
  LoanDetail,
  LoanItem,
  LoanRepayRequest,
  LoanRepayResponse,
} from '../types/loanTypes';

export const loanKeys = {
  all: ['loans'] as const,
  list: () => [...loanKeys.all, 'list'] as const,
  detail: (id: string) => [...loanKeys.all, 'detail', id] as const,
  repayQuote: (amount: number) => [...loanKeys.all, 'repayQuote', amount] as const,
};

export function useLoansQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<LoanItem[], Error> {
  return useQuery({
    queryKey: loanKeys.list(),
    queryFn: () => loansApi.getLoans(),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useLoanDetailQuery(id: string): UseQueryResult<LoanDetail, Error> {
  return useQuery({
    queryKey: loanKeys.detail(id),
    queryFn: () => loansApi.getLoanById(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useRepayQuoteQuery(
  amount: number,
  enabled = true,
): UseQueryResult<TransferQuoteResponse, Error> {
  return useQuery({
    queryKey: loanKeys.repayQuote(amount),
    queryFn: () => loansApi.getRepayQuote(amount),
    enabled: enabled && amount > 0,
    staleTime: 30_000,
  });
}

export function useSendRepayOtpMutation() {
  return useMutation<{ ok: boolean }, Error, number | undefined>({
    mutationFn: amount => loansApi.sendRepayOtp(amount),
  });
}

export function useRepayLoanMutation(loanId: string) {
  const queryClient = useQueryClient();
  return useMutation<LoanRepayResponse, Error, LoanRepayRequest>({
    mutationFn: payload => loansApi.repayLoan(loanId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
      queryClient.invalidateQueries({ queryKey: memberAccountKeys.all });
    },
  });
}
