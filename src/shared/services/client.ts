import axios, {
  type AxiosAdapter,
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getAppVersionHeader } from '@shared/utils/appVersion';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
    _retry?: boolean;
    idempotencyKey?: string;
  }
}

/** Normalised error shape for failed API calls. */
export class ApiError extends Error {
  readonly isAxiosError = true;
  readonly response?: unknown;

  constructor(
    message: string,
    readonly kind: 'network' | 'timeout' | 'http' | 'validation' = 'http',
    readonly status?: number,
    readonly cause?: unknown,
    readonly errorCode?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    if (axios.isAxiosError(cause)) {
      this.response = cause.response;
    }
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type ApiClientConfig = {
  /** Supplied from environment configuration. Never hardcode endpoints. */
  baseUrl: string;
  timeoutMs?: number;
  /** Returns the current auth token, if any. */
  getAuthToken?: () => string | null | Promise<string | null>;
  /**
   * Optional callback invoked on a 401 response for authenticated requests.
   * Concurrent 401s share a single in-flight refresh promise.
   */
  onRefreshToken?: () => Promise<string | null>;
  adapter?: AxiosAdapter;
};

export type RequestOptions = {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export interface ApiClient {
  readonly instance: AxiosInstance;
  request<T>(method: HttpMethod, path: string, data?: unknown, options?: RequestOptions): Promise<T>;
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const axiosInstance: AxiosInstance = axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeoutMs ?? 15_000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    adapter: config.adapter,
  });

  axiosInstance.interceptors.request.use(async (reqConfig: InternalAxiosRequestConfig) => {
    reqConfig.headers.set('X-App-Version', getAppVersionHeader());

    if (!reqConfig.skipAuth && config.getAuthToken) {
      const token = await config.getAuthToken();
      if (token) {
        reqConfig.headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (reqConfig.idempotencyKey) {
      reqConfig.headers.set('Idempotency-Key', reqConfig.idempotencyKey);
    }

    return reqConfig;
  });

  let refreshPromise: Promise<string | null> | null = null;

  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (!originalRequest) {
        return Promise.reject(normalizeError(error));
      }

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.skipAuth &&
        config.onRefreshToken
      ) {
        originalRequest._retry = true;

        if (!refreshPromise) {
          refreshPromise = config.onRefreshToken().finally(() => {
            refreshPromise = null;
          });
        }

        const newToken = await refreshPromise;
        if (newToken) {
          originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
          return axiosInstance(originalRequest);
        }
      }

      return Promise.reject(normalizeError(error));
    },
  );

  function normalizeError(error: unknown): ApiError {
    if (!axios.isAxiosError(error)) {
      return new ApiError(
        error instanceof Error ? error.message : 'Unknown network error',
        'network',
        undefined,
        error,
      );
    }

    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
      return new ApiError('Request timed out. Please check your connection and retry.', 'timeout', undefined, error);
    }

    if (!error.response) {
      return new ApiError(
        'Unable to reach server. Please check your internet connection.',
        'network',
        undefined,
        error,
      );
    }

    const status = error.response.status;
    const body = error.response.data as Record<string, unknown> | undefined;

    let message = 'An unexpected server error occurred.';
    let errorCode: string | undefined;

    if (body && typeof body === 'object') {
      if (typeof body.detail === 'string') {
        message = body.detail;
      } else if (typeof body.message === 'string') {
        message = body.message;
      } else if (typeof body.error === 'string') {
        message = body.error;
      }
      if (typeof body.code === 'string') {
        errorCode = body.code;
      }
    }

    const kind: ApiError['kind'] = status === 422 ? 'validation' : 'http';
    return new ApiError(message, kind, status, error, errorCode);
  }

  async function request<T>(
    method: HttpMethod,
    path: string,
    data?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    try {
      const response = await axiosInstance.request<T>({
        method,
        url: path,
        data,
        params: options?.params,
        headers: options?.headers,
        skipAuth: options?.skipAuth,
        idempotencyKey: options?.idempotencyKey,
        signal: options?.signal,
      });
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw normalizeError(error);
    }
  }

  return {
    instance: axiosInstance,
    request,
    get: (path, options) => request('GET', path, undefined, options),
    post: (path, data, options) => request('POST', path, data, options),
    put: (path, data, options) => request('PUT', path, data, options),
    patch: (path, data, options) => request('PATCH', path, data, options),
    delete: (path, options) => request('DELETE', path, undefined, options),
  };
}
