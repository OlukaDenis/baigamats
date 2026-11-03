import {
  loginRequestSchema,
  loginResponseSchema,
  logoutResponseSchema,
  mfaVerifyRequestSchema,
  mfaVerifyResponseSchema,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
} from '../schemas/authSchemas';

describe('authSchemas', () => {
  it('validates login request with email or staff username', () => {
    expect(
      loginRequestSchema.parse({
        login_id: 'jane@company.com',
        password: 'secret-password',
      }),
    ).toEqual({
      login_id: 'jane@company.com',
      password: 'secret-password',
    });
  });

  it('validates direct session login response and MFA required login response', () => {
    const direct = loginResponseSchema.parse({
      mfa_required: false,
      session: {
        access_token: 'acc-1',
        refresh_token: 'ref-1',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1900000000,
      },
      user: {
        id: 'usr-1',
        email: 'jane@company.com',
      },
      profile: {
        organization_id: 'org-1',
        role: 'admin',
      },
      needs_organization_setup: false,
    });
    expect('session' in direct && direct.session.access_token).toBe('acc-1');

    const mfaChallenge = loginResponseSchema.parse({
      mfa_required: true,
      factor_id: 'factor-123',
      mfa_session: {
        access_token: 'mfa-acc',
        refresh_token: 'mfa-ref',
      },
    });
    expect('mfa_required' in mfaChallenge && mfaChallenge.mfa_required).toBe(true);
  });

  it('validates MFA verification request and response', () => {
    expect(
      mfaVerifyRequestSchema.parse({
        factor_id: 'factor-123',
        code: '123456',
        mfa_session: {
          access_token: 'mfa-acc',
          refresh_token: 'mfa-ref',
        },
      }).code,
    ).toBe('123456');

    expect(() =>
      mfaVerifyRequestSchema.parse({
        factor_id: 'factor-123',
        code: '12ab',
        mfa_session: { access_token: 'a', refresh_token: 'b' },
      }),
    ).toThrow();

    const verified = mfaVerifyResponseSchema.parse({
      session: {
        access_token: 'acc-2',
        refresh_token: 'ref-2',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: null,
      },
      user: { id: 'usr-1', email: 'jane@company.com' },
      profile: null,
      needs_organization_setup: true,
    });
    expect(verified.needs_organization_setup).toBe(true);
  });

  it('validates refresh, logout, and register payloads', () => {
    const refreshed = refreshResponseSchema.parse({
      session: {
        access_token: 'acc-new',
        refresh_token: 'ref-new',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1900003600,
      },
    });
    expect(refreshed.session.refresh_token).toBe('ref-new');

    expect(logoutResponseSchema.parse({ ok: true })).toEqual({ ok: true });

    expect(() =>
      registerRequestSchema.parse({ email: 'user@example.com', password: 'short' }),
    ).toThrow();

    expect(
      registerResponseSchema.parse({
        status: 'confirmation_sent',
        message: 'Check your inbox',
      }),
    ).toEqual({
      status: 'confirmation_sent',
      message: 'Check your inbox',
    });
  });
});
