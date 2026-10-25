import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { env } from '../../app/config/env';
import { isSessionExpired, useAuthStore } from '../../features/auth/store/authStore';
import type { RefreshResponse } from '../../features/auth/types/authTypes';
import { createApiClient, type ApiClient } from './client';

/**
 * Shared singleton API client wired to `env` and `useAuthStore`.
 * Uses standard Axios request and response interceptors to inject
 * Bearer token and handle automatic 401 token refresh.
 */
export function createConfiguredApiClient(axiosInstance?: AxiosInstance): ApiClient {
  const baseUrl = env.API_BASE_URL.replace(/\/+$/, '');

  async function performRefresh(): Promise<string | null> {
    const currentRefreshToken = useAuthStore.getState().session?.refresh_token;
    if (!currentRefreshToken) {
      return null;
    }

    try {
      // Direct raw axios request to prevent 401 interceptor loop
      const response = await axios.post<RefreshResponse>(
        `${baseUrl}/auth/refresh`,
        { refresh_token: currentRefreshToken },
        { headers: { 'Content-Type': 'application/json' }, timeout: env.API_TIMEOUT_MS },
      );
      const session = response.data.session;
      await useAuthStore.getState().updateSession(session);
      return session.access_token;
    } catch {
      await useAuthStore.getState().clearAuth();
      return null;
    }
  }

  return createApiClient({
    baseUrl,
    timeoutMs: env.API_TIMEOUT_MS,
    axiosInstance,
    getAuthToken: async () => {
      const session = useAuthStore.getState().session;
      if (!session) {
        return null;
      }
      if (isSessionExpired(session)) {
        return performRefresh();
      }
      return session.access_token;
    },
    refreshAuthToken: performRefresh,
  });
}

export const apiClient: ApiClient = createConfiguredApiClient();
