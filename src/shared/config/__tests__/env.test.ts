import { parseEnv } from '../env';

describe('parseEnv', () => {
  it('returns default production-safe Baigamats API settings when env is empty', () => {
    const config = parseEnv({});

    expect(config).toEqual({
      APP_ENV: 'development',
      APP_VARIANT: 'sacco',
      API_BASE_URL: 'https://business.baigamats.com/api/v1',
      HORECA_API_BASE_URL: 'https://urchin-app-w43e8.ondigitalocean.app',
      API_TIMEOUT_MS: 15_000,
      ENABLE_MOCK: false,
    });
  });

  it('parses custom valid environment values with ENABLE_MOCK true', () => {
    const config = parseEnv({
      APP_ENV: 'development',
      APP_VARIANT: 'horeca',
      API_BASE_URL: 'https://urchin-app-w43e8.ondigitalocean.app',
      HORECA_API_BASE_URL: 'https://urchin-app-w43e8.ondigitalocean.app',
      API_TIMEOUT_MS: '20000',
      ENABLE_MOCK: 'true',
    });

    expect(config).toEqual({
      APP_ENV: 'development',
      APP_VARIANT: 'horeca',
      API_BASE_URL: 'https://urchin-app-w43e8.ondigitalocean.app',
      HORECA_API_BASE_URL: 'https://urchin-app-w43e8.ondigitalocean.app',
      API_TIMEOUT_MS: 20_000,
      ENABLE_MOCK: true,
    });
  });

  it('parses custom valid environment values with ENABLE_MOCK false', () => {
    const config = parseEnv({
      APP_ENV: 'staging',
      APP_VARIANT: 'horeca',
      API_BASE_URL: 'https://staging.baigamats.com/api/v1',
      HORECA_API_BASE_URL: 'https://horeca-staging.baigamats.com',
      API_TIMEOUT_MS: '20000',
      ENABLE_MOCK: 'false',
    });

    expect(config).toEqual({
      APP_ENV: 'staging',
      APP_VARIANT: 'horeca',
      API_BASE_URL: 'https://staging.baigamats.com/api/v1',
      HORECA_API_BASE_URL: 'https://horeca-staging.baigamats.com',
      API_TIMEOUT_MS: 20_000,
      ENABLE_MOCK: false,
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
