import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { env } from '../../app/config/env';
import { isSessionExpired, useAuthStore } from '../../features/auth/store/authStore';
import type { RefreshResponse } from '../../features/auth/types/authTypes';
import { getAppVersionHeader } from '../../utils/appVersion';
import { createApiClient, type ApiClient } from './client';

/**
 * Shared singleton API client wired to `env` and `useAuthStore`.
 * Uses standard Axios request and response interceptors to inject
 * Bearer token, X-App-Version, and handle automatic 401 token refresh.
 */
export function createConfiguredApiClient(axiosInstance?: AxiosInstance): ApiClient {
  const baseUrl = env.API_BASE_URL.replace(/\/+$/, '');

  async function performRefresh(): Promise<string | null> {
    const state = useAuthStore.getState();
    const currentRefreshToken = state.session?.refresh_token;
    if (!currentRefreshToken) {
      return null;
    }

    const isMember =
      state.authType === 'member' ||
      Boolean(state.session?.access_token.startsWith('bmm_'));

    const refreshUrl = isMember
      ? `${baseUrl}/member/auth/refresh`
      : `${baseUrl}/auth/refresh`;

    try {
      // Direct raw axios request to prevent 401 interceptor loop
      const response = await axios.post<RefreshResponse>(
        refreshUrl,
        { refresh_token: currentRefreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-App-Version': getAppVersionHeader(),
          },
          timeout: env.API_TIMEOUT_MS,
        },
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
