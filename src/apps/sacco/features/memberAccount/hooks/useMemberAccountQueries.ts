import {
  useInfiniteQuery,
  useQuery,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { memberAccountApi } from '../api/memberAccountApi';
import type {
  MemberMeResponse,
  MemberTransactionsResponse,
  TransactionFilter,
} from '../types/memberAccountTypes';

export const memberAccountKeys = {
  all: ['member'] as const,
  me: () => [...memberAccountKeys.all, 'me'] as const,
  transactions: (filters?: Partial<TransactionFilter>) =>
    [...memberAccountKeys.all, 'transactions', filters] as const,
  infiniteTransactions: (filters?: { from?: string; to?: string; limit?: number }) =>
    [...memberAccountKeys.all, 'transactions-infinite', filters] as const,
};

export function useMemberMeQuery(): UseQueryResult<MemberMeResponse, Error> {
  return useQuery({
    queryKey: memberAccountKeys.me(),
    queryFn: () => memberAccountApi.getMe(),
    staleTime: 30_000,
  });
}

export function useMemberTransactionsQuery(
  filters?: Partial<TransactionFilter>,
): UseQueryResult<MemberTransactionsResponse, Error> {
  return useQuery({
    queryKey: memberAccountKeys.transactions(filters),
    queryFn: () => memberAccountApi.getTransactions(filters),
    staleTime: 15_000,
  });
}

export function useMemberTransactionsInfiniteQuery(
  filters?: { from?: string; to?: string; limit?: number },
): UseInfiniteQueryResult<{ pages: MemberTransactionsResponse[] }, Error> {
  const limit = filters?.limit ?? 20;

  return useInfiniteQuery({
    queryKey: memberAccountKeys.infiniteTransactions(filters),
    queryFn: ({ pageParam = 0 }) =>
      memberAccountApi.getTransactions({
        limit,
        offset: pageParam,
        from: filters?.from,
        to: filters?.to,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    staleTime: 15_000,
  });
}

