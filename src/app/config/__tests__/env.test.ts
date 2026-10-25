import { parseEnv } from '../env';

describe('parseEnv', () => {
  it('returns default production-safe Baigamats API settings when env is empty', () => {
    const config = parseEnv({});

    expect(config).toEqual({
      APP_ENV: 'development',
      API_BASE_URL: 'https://business.baigamats.com/api/v1',
      API_TIMEOUT_MS: 15_000,
    });
  });

  it('parses custom valid environment values', () => {
    const config = parseEnv({
      APP_ENV: 'staging',
      API_BASE_URL: 'https://staging.baigamats.com/api/v1',
      API_TIMEOUT_MS: '20000',
    });

    expect(config).toEqual({
      APP_ENV: 'staging',
      API_BASE_URL: 'https://staging.baigamats.com/api/v1',
      API_TIMEOUT_MS: 20_000,
    });
  });

  it('rejects non-HTTPS non-localhost URLs', () => {
    expect(() =>
      parseEnv({
        API_BASE_URL: 'http://business.baigamats.com/api/v1',
      }),
    ).toThrow(/HTTPS/i);
  });
});
