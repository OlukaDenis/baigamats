import axios from 'axios';
import { createApiClient } from '../client';
import { getAppVersionHeader } from '../../../utils/appVersion';
import { generateIdempotencyKey } from '../../../utils/idempotency';

describe('API Client Member Protocols (Phase 1)', () => {
  it('automatically injects X-App-Version header on every request', async () => {
    let capturedHeaders: Record<string, string> = {};

    const customAdapter = async (config: any) => {
      capturedHeaders = config.headers;
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const client = createApiClient({
      baseUrl: 'https://business.baigamats.com/api/v1',
      adapter: customAdapter as any,
    });

    await client.get('/test-endpoint');

    expect(capturedHeaders['X-App-Version']).toBe(getAppVersionHeader());
  });

  it('injects Idempotency-Key when provided in request config', async () => {
    let capturedHeaders: Record<string, string> = {};
    const testKey = generateIdempotencyKey();

    const customAdapter = async (config: any) => {
      capturedHeaders = config.headers;
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const client = createApiClient({
      baseUrl: 'https://business.baigamats.com/api/v1',
      adapter: customAdapter as any,
    });

    await client.post('/member/deposits', { amount: 50000 }, { idempotencyKey: testKey });

    expect(capturedHeaders['Idempotency-Key']).toBe(testKey);
  });
});

