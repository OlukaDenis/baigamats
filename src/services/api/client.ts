import { z } from 'zod';

/** Normalised error shape for every failed API call. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: 'network' | 'timeout' | 'http' | 'validation',
    readonly status?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiClientConfig = {
  /** Supplied from environment configuration. Never hardcode endpoints. */
  baseUrl: string;
  timeoutMs?: number;
  /** Returns the current auth token, if any. Tokens must never be logged. */
  getAuthToken?: () => string | null | Promise<string | null>;
  fetchImpl?: typeof fetch;
};

export type RequestOptions<TSchema extends z.ZodType> = {
  method?: HttpMethod;
  body?: unknown;
  /** Response schema: every response is validated before it reaches the app. */
  schema: TSchema;
  signal?: AbortSignal;
};

const DEFAULT_TIMEOUT_MS = 15_000;

export function createApiClient(config: ApiClientConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = config.baseUrl.replace(/\/+$/, '');

  async function request<TSchema extends z.ZodType>(
    path: string,
    { method = 'GET', body, schema, signal }: RequestOptions<TSchema>,
  ): Promise<z.infer<TSchema>> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onExternalAbort = () => controller.abort();
    signal?.addEventListener('abort', onExternalAbort);

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }
      const token = await config.getAuthToken?.();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let response: Response;
      try {
        response = await fetchImpl(`${baseUrl}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (error) {
        if (timedOut) {
          throw new ApiError('Request timed out', 'timeout', undefined, error);
        }
        throw new ApiError('Network request failed', 'network', undefined, error);
      }

      if (!response.ok) {
        throw new ApiError(
          `Request failed with status ${response.status}`,
          'http',
          response.status,
        );
      }

      const json: unknown = response.status === 204 ? null : await response.json();
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError(
          'Unexpected response format',
          'validation',
          response.status,
          parsed.error,
        );
      }
      return parsed.data;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onExternalAbort);
    }
  }

  return { request };
}

export type ApiClient = ReturnType<typeof createApiClient>;
