import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../../../services/api/client';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import type {
  LoginRequest,
  LoginResponse,
  LogoutScope,
  MfaVerifyRequest,
  MfaVerifyResponse,
  RegisterRequest,
  RegisterResponse,
} from '../types/authTypes';

export function getAuthErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network') {
      return 'Unable to connect. Check your internet connection and try again.';
    }
    if (error.kind === 'timeout') {
      return 'The request timed out. Please try again.';
    }
    if (error.status === 429) {
      return (
        error.message && !error.message.startsWith('Request failed')
          ? error.message
          : 'Too many attempts. Please wait a moment before trying again.'
      );
    }
    if (error.message && !error.message.startsWith('Request failed with status')) {
      return error.message;
    }
    if (error.status === 401) {
      return 'Invalid credentials or expired session.';
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function useLoginMutation() {
  const setAuthenticated = useAuthStore(state => state.setAuthenticated);
  const setPendingMfa = useAuthStore(state => state.setPendingMfa);

  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: payload => authApi.login(payload),
    onSuccess: async (result, variables) => {
      if ('mfa_required' in result && result.mfa_required === true) {
        setPendingMfa({
          factorId: result.factor_id,
          mfaSession: result.mfa_session,
          loginId: variables.login_id,
        });
        return;
      }

      await setAuthenticated({
        session: result.session,
        user: result.user ?? null,
        profile: result.profile ?? null,
        needsOrganizationSetup: Boolean(result.needs_organization_setup),
      });
    },
  });
}

export function useVerifyMfaMutation() {
  const setAuthenticated = useAuthStore(state => state.setAuthenticated);

  return useMutation<MfaVerifyResponse, Error, MfaVerifyRequest>({
    mutationFn: payload => authApi.verifyMfa(payload),
    onSuccess: async result => {
      await setAuthenticated({
        session: result.session,
        user: result.user ?? null,
        profile: result.profile ?? null,
        needsOrganizationSetup: Boolean(result.needs_organization_setup),
      });
    },
  });
}

export function useRegisterMutation() {
  return useMutation<RegisterResponse, Error, RegisterRequest>({
    mutationFn: payload => authApi.register(payload),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore(state => state.clearAuth);

  return useMutation<{ ok: boolean }, Error, { scope?: LogoutScope } | undefined>({
    mutationFn: async variables => {
      const scope = variables?.scope ?? 'local';
      return authApi.logout({ scope });
    },
    onSettled: async (_data, _error, variables) => {
      const scope = variables?.scope ?? 'local';
      if (scope === 'others') {
        return;
      }
      queryClient.clear();
      await clearAuth();
    },
  });
}
