import { useEffect, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { memberAccountKeys } from '../../memberAccount/hooks/useMemberAccountQueries';
import { depositsApi } from '../api/depositsApi';
import type {
  DepositQuoteResponse,
  DepositStatusResponse,
  InitiateDepositRequest,
  InitiateDepositResponse,
} from '../types/depositTypes';

export const depositKeys = {
  all: ['deposits'] as const,
  quote: (amount: number) => [...depositKeys.all, 'quote', amount] as const,
  status: (id: string | null) => [...depositKeys.all, 'status', id] as const,
};

/**
 * Hook to retrieve fee quotation before confirming a deposit.
 */
export function useDepositQuoteQuery(
  amount: number,
  enabled = true,
): UseQueryResult<DepositQuoteResponse, Error> {
  return useQuery({
    queryKey: depositKeys.quote(amount),
    queryFn: () => depositsApi.getQuote(amount),
    enabled: enabled && amount > 0,
    staleTime: 60_000,
  });
}

/**
 * Mutation to initiate the deposit and trigger the USSD push payment prompt.
 */
export function useInitiateDepositMutation() {
  return useMutation<InitiateDepositResponse, Error, InitiateDepositRequest>({
    mutationFn: payload => depositsApi.initiateDeposit(payload),
  });
}

/**
 * Polling hook that checks deposit status every 3.5 seconds until success or failure.
 * When successful, it automatically invalidates member balances and statements.
 */
export function useDepositStatusPolling(
  depositId: string | null,
  options?: {
    onSuccess?: (res: DepositStatusResponse) => void;
    onFailed?: (res: DepositStatusResponse) => void;
  },
) {
  const queryClient = useQueryClient();
  const [isSettled, setIsSettled] = useState(false);

  const query = useQuery({
    queryKey: depositKeys.status(depositId),
    queryFn: () => depositsApi.getStatus(depositId!),
    enabled: Boolean(depositId) && !isSettled,
    refetchInterval: queryData => {
      const status = queryData?.state?.data?.status;
      if (status === 'success' || status === 'failed') {
        return false;
      }
      return 3500; // Poll every 3.5 seconds per brief rule (3 to 5 seconds)
    },
    refetchIntervalInBackground: true,
  });

  const status = query.data?.status;

  useEffect(() => {
    if (!depositId || isSettled) return;

    if (status === 'success') {
      setIsSettled(true);
      queryClient.invalidateQueries({ queryKey: memberAccountKeys.all });
      options?.onSuccess?.(query.data!);
    } else if (status === 'failed') {
      setIsSettled(true);
      options?.onFailed?.(query.data!);
    }
  }, [status, depositId, isSettled, query.data, queryClient, options]);

  return {
    ...query,
    isSettled,
    depositStatus: status ?? 'pending',
    resultMessage: query.data?.message,
  };
}

