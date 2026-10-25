import NetInfo from '@react-native-community/netinfo';
import { onlineManager, QueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { ApiError } from './client';

/** Do not retry errors that will not succeed on retry (4xx, bad payloads). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.kind === 'validation') {
      return false;
    }
    if (error.kind === 'http' && error.status !== undefined && error.status < 500) {
      return false;
    }
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status !== undefined && status < 500) {
      return false;
    }
  }
  return failureCount < 3;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Lets TanStack Query pause/resume requests based on device connectivity.
 * Returns the unsubscribe function.
 */
export function connectOnlineManager(): () => void {
  onlineManager.setEventListener(setOnline =>
    NetInfo.addEventListener(state => {
      setOnline(state.isConnected !== false);
    }),
  );
  return () => onlineManager.setEventListener(() => undefined);
}
