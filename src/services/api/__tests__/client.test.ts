import { z } from 'zod';

import { ApiError, createApiClient } from '../client';

const userSchema = z.object({ id: z.number(), name: z.string() });

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('createApiClient', () => {
  it('returns validated data and sends auth + JSON headers', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ id: 1, name: 'Ana' }));
    const client = createApiClient({
      baseUrl: 'https://api.example.test/',
      fetchImpl,
      getAuthToken: () => 'token-123',
    });

    const user = await client.request('/users/1', {
      method: 'POST',
      body: { a: 1 },
      schema: userSchema,
    });

    expect(user).toEqual({ id: 1, name: 'Ana' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.example.test/users/1');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer token-123',
      'Content-Type': 'application/json',
    });
    expect(init.body).toBe('{"a":1}');
  });

  it('omits the Authorization header when there is no token', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ id: 1, name: 'Ana' }));
    const client = createApiClient({ baseUrl: 'https://x.test', fetchImpl });

    await client.request('/me', { schema: userSchema });

    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('throws a validation ApiError for unexpected payloads', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ id: 'nope' }));
    const client = createApiClient({ baseUrl: 'https://x.test', fetchImpl });

    await expect(client.request('/me', { schema: userSchema })).rejects.toMatchObject({
      kind: 'validation',
    });
  });

  it('throws an http ApiError with the status code for non-2xx responses', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({}, 404));
    const client = createApiClient({ baseUrl: 'https://x.test', fetchImpl });

    const error = await client.request('/me', { schema: userSchema }).catch(e => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'http', status: 404 });
  });

  it('throws a network ApiError when fetch rejects', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const client = createApiClient({ baseUrl: 'https://x.test', fetchImpl });

    await expect(client.request('/me', { schema: userSchema })).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('throws a timeout ApiError when the request exceeds timeoutMs', async () => {
    jest.useFakeTimers();
    const fetchImpl: typeof fetch = jest.fn(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const client = createApiClient({ baseUrl: 'https://x.test', fetchImpl, timeoutMs: 1000 });

    const pending = client.request('/slow', { schema: userSchema });
    await Promise.resolve();
    jest.advanceTimersByTime(1000);

    await expect(pending).rejects.toMatchObject({ kind: 'timeout' });
    jest.useRealTimers();
  });
});
