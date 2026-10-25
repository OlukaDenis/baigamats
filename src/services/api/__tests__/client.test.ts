import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { ApiError, createApiClient } from '../client';

interface User {
  id: number;
  name: string;
}

describe('createApiClient standard Axios setup', () => {
  it('performs get, post, put, delete and injects auth header via request interceptor', async () => {
    const adapter: AxiosAdapter = jest.fn().mockImplementation(async (config: InternalAxiosRequestConfig) => {
      return {
        data: { id: 1, name: 'Ana' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    });

    const client = createApiClient({
      baseUrl: 'https://api.example.test/',
      adapter,
      getAuthToken: () => 'token-123',
    });

    const response = await client.post<User>('/users', { name: 'Ana' });

    expect(response.data).toEqual({ id: 1, name: 'Ana' });
    expect(adapter).toHaveBeenCalledTimes(1);

    const callConfig = (adapter as jest.Mock).mock.calls[0][0];
    expect(callConfig.url).toBe('/users');
    expect(callConfig.method).toBe('post');
    expect(callConfig.data).toEqual(JSON.stringify({ name: 'Ana' }));
    expect(callConfig.headers.Authorization).toBe('Bearer token-123');
  });

  it('omits the Authorization header when skipAuth is true', async () => {
    const adapter: AxiosAdapter = jest.fn().mockImplementation(async (config: InternalAxiosRequestConfig) => {
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    });

    const client = createApiClient({
      baseUrl: 'https://x.test',
      adapter,
      getAuthToken: () => 'token-123',
    });

    await client.post('/auth/login', { user: 'test' }, { skipAuth: true });

    const callConfig = (adapter as jest.Mock).mock.calls[0][0];
    expect(callConfig.headers.Authorization).toBeUndefined();
  });

  it('passes query parameters and custom headers correctly', async () => {
    const adapter: AxiosAdapter = jest.fn().mockImplementation(async (config: InternalAxiosRequestConfig) => {
      return {
        data: [{ id: 1, name: 'Ana' }],
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    });

    const client = createApiClient({
      baseUrl: 'https://x.test',
      adapter,
    });

    await client.get('/users', {
      params: { search: 'Ana', limit: 10 },
      headers: { 'X-Custom-Header': 'custom-val' },
    });

    const callConfig = (adapter as jest.Mock).mock.calls[0][0];
    expect(callConfig.params).toEqual({ search: 'Ana', limit: 10 });
    expect(callConfig.headers['X-Custom-Header']).toBe('custom-val');
  });

  it('throws an http ApiError with server error message and code when present', async () => {
    const adapter: AxiosAdapter = jest.fn().mockImplementation(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError(
        'Request failed with status code 401',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
          data: { error: { code: 'invalid_credentials', message: 'Wrong password' } },
        },
      );
    });

    const client = createApiClient({ baseUrl: 'https://x.test', adapter });

    const error = await client.get('/auth/login').catch(e => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      kind: 'http',
      status: 401,
      message: 'Wrong password',
      errorCode: 'invalid_credentials',
    });
  });

  it('performs token refresh on 401 via response interceptor and retries concurrent requests', async () => {
    let callCount = 0;
    const adapter: AxiosAdapter = jest.fn().mockImplementation(async (config: InternalAxiosRequestConfig) => {
      callCount += 1;
      const authHeader = config?.headers?.Authorization;
      if (authHeader === 'Bearer fresh-token') {
        return {
          data: { id: callCount, name: 'Ana' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      throw new AxiosError(
        'Request failed with status code 401',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
          data: { error: { code: 'token_expired', message: 'Expired' } },
        },
      );
    });

    const refreshAuthToken = jest.fn().mockResolvedValue('fresh-token');

    const client = createApiClient({
      baseUrl: 'https://x.test',
      adapter,
      getAuthToken: () => 'expired-token',
      refreshAuthToken,
    });

    const [first, second] = await Promise.all([
      client.get<User>('/me'),
      client.get<User>('/me'),
    ]);

    expect(refreshAuthToken).toHaveBeenCalledTimes(1);
    expect(first.data.name).toBe('Ana');
    expect(second.data.name).toBe('Ana');
  });

  it('throws a network ApiError when axios network request rejects without response', async () => {
    const adapter: AxiosAdapter = jest.fn().mockImplementation(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    });

    const client = createApiClient({ baseUrl: 'https://x.test', adapter });

    await expect(client.get('/me')).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('throws a timeout ApiError when the request exceeds timeoutMs', async () => {
    const adapter: AxiosAdapter = jest.fn().mockImplementation(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('timeout of 1000ms exceeded', 'ECONNABORTED', config);
    });

    const client = createApiClient({
      baseUrl: 'https://x.test',
      adapter,
      timeoutMs: 1000,
    });

    await expect(client.get('/slow')).rejects.toMatchObject({
      kind: 'timeout',
    });
  });
});
