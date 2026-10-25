import type { AxiosInstance } from 'axios';
import { apiClient } from '../../../services/api/apiClient';
import type {
  Business,
  BusinessResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  MfaVerifyRequest,
  MfaVerifyResponse,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
} from '../types/authTypes';

export function createAuthApi(client: AxiosInstance = apiClient) {
  return {
    /**
     * `POST /auth/login`
     * Sign in with email or staff username (`login_id`) and password.
     * Returns either an MFA challenge (`mfa_required: true`) or an active session.
     */
    async login(payload: LoginRequest): Promise<LoginResponse> {
      const response = await client.post<LoginResponse>('/auth/login', payload, {
        skipAuth: true,
      });
      return response.data;
    },

    /**
     * `POST /auth/mfa/verify`
     * Complete a two-step sign-in using `factor_id`, 6-digit `code`, and `mfa_session`.
     */
    async verifyMfa(payload: MfaVerifyRequest): Promise<MfaVerifyResponse> {
      const response = await client.post<MfaVerifyResponse>('/auth/mfa/verify', payload, {
        skipAuth: true,
      });
      return response.data;
    },

    /**
     * `POST /auth/refresh`
     * Exchange a refresh token for a new access token and a rotated refresh token.
     */
    async refreshSession(payload: RefreshRequest): Promise<RefreshResponse> {
      const response = await client.post<RefreshResponse>('/auth/refresh', payload, {
        skipAuth: true,
      });
      return response.data;
    },

    /**
     * `POST /auth/logout`
     * Ends the session of the access token sent in the Authorization header.
     */
    async logout(payload?: LogoutRequest): Promise<LogoutResponse> {
      const response = await client.post<LogoutResponse>(
        '/auth/logout',
        payload ?? { scope: 'local' },
      );
      return response.data;
    },

    /**
     * `POST /auth/register`
     * Create an account (202 Accepted: confirmation email on its way).
     */
    async register(payload: RegisterRequest): Promise<RegisterResponse> {
      const response = await client.post<RegisterResponse>('/auth/register', payload, {
        skipAuth: true,
      });
      return response.data;
    },

    /**
     * `GET /business`
     * Fetch the signed-in user's business profile.
     */
    async getBusiness(): Promise<Business> {
      const response = await client.get<BusinessResponse>('/business');
      return response.data.data;
    },
  };
}

export const authApi = createAuthApi();
