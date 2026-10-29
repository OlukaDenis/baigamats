import type { AxiosInstance } from 'axios';
import { apiClient } from '../../../services/api/apiClient';
import type {
  MemberChangePasswordRequest,
  MemberChangePasswordResponse,
  MemberLoginRequest,
  MemberLoginResponse,
  MemberLogoutResponse,
  MemberRefreshRequest,
  MemberRefreshResponse,
} from '../types/memberAuthTypes';

export function createMemberAuthApi(client: AxiosInstance = apiClient) {
  return {
    /**
     * `POST /member/auth/login`
     * Sign in as a cooperative member using org, member_no, and 4-5 digit PIN.
     */
    async login(payload: MemberLoginRequest): Promise<MemberLoginResponse> {
      const response = await client.post<MemberLoginResponse>(
        '/member/auth/login',
        payload,
        { skipAuth: true },
      );
      return response.data;
    },

    /**
     * `POST /member/auth/refresh`
     * Exchange a refresh token for a new session with rotated refresh token.
     */
    async refresh(payload: MemberRefreshRequest): Promise<MemberRefreshResponse> {
      const response = await client.post<MemberRefreshResponse>(
        '/member/auth/refresh',
        payload,
        { skipAuth: true },
      );
      return response.data;
    },

    /**
     * `POST /member/auth/logout`
     * Ends the member session.
     */
    async logout(): Promise<MemberLogoutResponse> {
      const response = await client.post<MemberLogoutResponse>(
        '/member/auth/logout',
        {},
      );
      return response.data;
    },

    /**
     * `POST /member/auth/change-password`
     * Set a new 4 or 5 digit PIN.
     * `current` is optional when called right after temporary PIN.
     */
    async changePassword(
      payload: MemberChangePasswordRequest,
    ): Promise<MemberChangePasswordResponse> {
      const response = await client.post<MemberChangePasswordResponse>(
        '/member/auth/change-password',
        payload,
      );
      return response.data;
    },
  };
}

export const memberAuthApi = createMemberAuthApi();

