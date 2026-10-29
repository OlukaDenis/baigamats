import { useEffect, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { memberAccountKeys } from '../../memberAccount/hooks/useMemberAccountQueries';
import { transfersApi } from '../api/transfersApi';
import type {
  AddBeneficiaryRequest,
  Beneficiary,
  RequestStatusDetailResponse,
  TransferKind,
  TransferQuoteResponse,
  TransferRequestResponse,
  TransferRequestSubmission,
} from '../types/transferTypes';

export const transferKeys = {
  all: ['transfers'] as const,
  beneficiaries: () => [...transferKeys.all, 'beneficiaries'] as const,
  quote: (kind: TransferKind, amountOrShares?: number) =>
    [...transferKeys.all, 'quote', kind, amountOrShares] as const,
  requestStatus: (id: string | null) => [...transferKeys.all, 'status', id] as const,
};

// --- Beneficiaries Hooks ---

export function useBeneficiariesQuery(): UseQueryResult<Beneficiary[], Error> {
  return useQuery({
    queryKey: transferKeys.beneficiaries(),
    queryFn: () => transfersApi.getBeneficiaries(),
    staleTime: 60_000,
  });
}

export function useSendBeneficiaryOtpMutation() {
  return useMutation<{ ok: boolean }, Error>({
    mutationFn: () => transfersApi.sendBeneficiaryOtp(),
  });
}

export function useAddBeneficiaryMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, AddBeneficiaryRequest>({
    mutationFn: payload => transfersApi.addBeneficiary(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.beneficiaries() });
    },
  });
}

export function useDeleteBeneficiaryMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: id => transfersApi.deleteBeneficiary(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.beneficiaries() });
    },
  });
}

// --- Transfer Hooks ---

export function useTransferQuoteQuery(params: {
  kind: TransferKind;
  amount?: number;
  shares?: number;
  enabled?: boolean;
}): UseQueryResult<TransferQuoteResponse, Error> {
  const value = params.shares ?? params.amount ?? 0;
  return useQuery({
    queryKey: transferKeys.quote(params.kind, value),
    queryFn: () =>
      transfersApi.getQuote({
        kind: params.kind,
        amount: params.amount,
        shares: params.shares,
      }),
    enabled: params.enabled !== false && value > 0,
    staleTime: 30_000,
  });
}

export function useSendTransferOtpMutation() {
  return useMutation<{ ok: boolean }, Error, { kind: TransferKind; amount?: number }>({
    mutationFn: payload => transfersApi.sendRequestOtp(payload),
  });
}

export function useSubmitTransferMutation() {
  const queryClient = useQueryClient();
  return useMutation<TransferRequestResponse, Error, TransferRequestSubmission>({
    mutationFn: payload => transfersApi.submitRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberAccountKeys.all });
    },
  });
}

export function useRequestStatusPolling(
  requestId: string | null,
  options?: {
    onCompleted?: (status: RequestStatusDetailResponse) => void;
    onRejected?: (status: RequestStatusDetailResponse) => void;
  },
) {
  const queryClient = useQueryClient();
  const [isSettled, setIsSettled] = useState(false);

  const query = useQuery({
    queryKey: transferKeys.requestStatus(requestId),
    queryFn: () => transfersApi.getRequestStatus(requestId!),
    enabled: Boolean(requestId) && !isSettled,
    refetchInterval: queryData => {
      const status = queryData?.state?.data?.status;
      if (status === 'completed' || status === 'rejected' || status === 'reversed') {
        return false;
      }
      return 4000;
    },
  });

  const status = query.data?.status;

  useEffect(() => {
    if (!requestId || isSettled) return;

    if (status === 'completed') {
      setIsSettled(true);
      queryClient.invalidateQueries({ queryKey: memberAccountKeys.all });
      options?.onCompleted?.(query.data!);
    } else if (status === 'rejected' || status === 'reversed') {
      setIsSettled(true);
      options?.onRejected?.(query.data!);
    }
  }, [status, requestId, isSettled, query.data, queryClient, options]);

  return {
    ...query,
    isSettled,
    requestStatus: status ?? 'waiting_for_approval',
  };
}

