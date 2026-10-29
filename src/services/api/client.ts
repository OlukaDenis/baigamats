import axios, {
  type AxiosAdapter,
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getAppVersionHeader } from '../../utils/appVersion';

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
  refreshAuthToken?: () => Promise<string | null>;
  /** Custom Axios instance if provided. */
  axiosInstance?: AxiosInstance;
  /** Optional custom adapter (e.g. for testing). */
  adapter?: AxiosAdapter;
  /** Optional default headers to send with every request */
  defaultHeaders?: Record<string, string>;
};

export function normalizeError(err: unknown): Error {
  if (err instanceof ApiError) {
    return err;
  }

  if (axios.isAxiosError(err)) {
    // Timeout check
    if (
      err.code === 'ECONNABORTED' ||
      err.code === 'ETIMEDOUT' ||
      err.message?.toLowerCase().includes('timeout')
    ) {
      return new ApiError('Request timed out', 'timeout', undefined, err);
    }

    // Network failure (no response received from server)
    if (!err.response) {
      return new ApiError('Network request failed', 'network', undefined, err);
    }

    // Server responded with an error status (4xx, 5xx)
    const status = err.response.status;
    let message: string | undefined;
    let errorCode: string | undefined;

    const data = err.response.data as
      | { error?: { message?: string; code?: string }; message?: string; code?: string }
      | undefined;

    if (data && typeof data === 'object') {
      if (data.error && typeof data.error === 'object') {
        message = data.error.message;
        errorCode = data.error.code;
      } else if (data.message) {
        message = data.message;
        errorCode = data.code;
      }
    }

    return new ApiError(
      message || `Request failed with status ${status}`,
      'http',
      status,
      err,
      errorCode,
    );
  }

  return new ApiError(
    err instanceof Error ? err.message : 'Network request failed',
    'network',
    undefined,
    err,
  );
}

const DEFAULT_TIMEOUT_MS = 15_000;

export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = config.baseUrl.replace(/\/+$/, '');

  const instance: AxiosInstance =
    config.axiosInstance ??
    axios.create({
      baseURL: baseUrl,
      timeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...config.defaultHeaders,
      },
      ...(config.adapter ? { adapter: config.adapter } : {}),
    });

  // Request interceptor: inject Bearer token, X-App-Version, and optional Idempotency-Key
  instance.interceptors.request.use(
    async (requestConfig: InternalAxiosRequestConfig & { idempotencyKey?: string }) => {
      requestConfig.headers = requestConfig.headers || {};

      // Send X-App-Version on every call per Baigamats API v1 rule 2
      if (!requestConfig.headers['X-App-Version']) {
        requestConfig.headers['X-App-Version'] = getAppVersionHeader();
      }

      // Attach Idempotency-Key if specified in request config
      if (requestConfig.idempotencyKey && !requestConfig.headers['Idempotency-Key']) {
        requestConfig.headers['Idempotency-Key'] = requestConfig.idempotencyKey;
      }

      if (!requestConfig.skipAuth && config.getAuthToken) {
        const token = await config.getAuthToken();
        if (token) {
          if (!requestConfig.headers.Authorization) {
            requestConfig.headers.Authorization = `Bearer ${token}`;
          }
        }
      }
      return requestConfig;
    },
    (error) => Promise.reject(normalizeError(error)),
  );

  // Response interceptor: 401 token refresh retry & error normalization
  let isRefreshing = false;
  let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }> = [];

  const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else if (token) {
        prom.resolve(token);
      }
    });
    failedQueue = [];
  };

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) {
        return Promise.reject(normalizeError(error));
      }

      const originalRequest = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean; skipAuth?: boolean })
        | undefined;

      // Reactive 401 token refresh retry
      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !originalRequest.skipAuth &&
        config.refreshAuthToken
      ) {
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return instance(originalRequest);
            })
            .catch((err) => Promise.reject(normalizeError(err)));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const newToken = await config.refreshAuthToken();
          if (newToken) {
            processQueue(null, newToken);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalRequest);
          } else {
            const apiError = normalizeError(error);
            processQueue(apiError, null);
            return Promise.reject(apiError);
          }
        } catch (refreshErr) {
          const apiError = normalizeError(refreshErr);
          processQueue(apiError, null);
          return Promise.reject(apiError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(normalizeError(error));
    },
  );

  return instance;
}

export type ApiClient = AxiosInstance;
export type { AxiosInstance, AxiosResponse, AxiosRequestConfig };
