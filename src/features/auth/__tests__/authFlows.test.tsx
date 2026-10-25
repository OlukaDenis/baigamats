import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { App } from '../../../app/App';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

describe('Authentication & Bottom Tab Navigation Flows', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await act(async () => {
      await useAuthStore.getState().clearAuth();
    });
  });

  it('shows SplashScreen while hydrating, then transitions to LoginScreen when unauthenticated', async () => {
    await act(async () => {
      useAuthStore.setState({ status: 'hydrating' });
    });

    await render(<App />);

    expect(
      await screen.findByRole('header', { name: 'Sign in' }),
    ).toBeOnTheScreen();
  });

  it('handles two-step MFA login flow and navigates to Home & Profile bottom tabs', async () => {
    jest.spyOn(authApi, 'login').mockResolvedValueOnce({
      mfa_required: true,
      factor_id: 'factor-99',
      mfa_session: {
        access_token: 'temp-access',
        refresh_token: 'temp-refresh',
      },
    });

    jest.spyOn(authApi, 'verifyMfa').mockResolvedValueOnce({
      session: {
        access_token: 'live-access',
        refresh_token: 'live-refresh',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1999999999,
      },
      user: {
        id: 'user-1',
        email: 'jane@company.com',
      },
      profile: {
        organization_id: 'org-42',
        role: 'admin',
      },
      needs_organization_setup: false,
    });

    jest.spyOn(authApi, 'getBusiness').mockResolvedValue({
      name: 'Kampala General Store',
      legal_name: 'Kampala General Store Ltd',
      currency: 'UGX',
    });

    jest.spyOn(authApi, 'logout').mockResolvedValueOnce({ ok: true });

    await render(<App />);

    const loginInput = await screen.findByLabelText('Email or staff username');
    const passwordInput = screen.getByLabelText('Password');

    await fireEvent.changeText(loginInput, 'jane@company.com');
    await fireEvent.changeText(passwordInput, 'supersecret123');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    // MFA Verify screen appears
    expect(
      await screen.findByRole('header', { name: 'Two-step sign-in' }),
    ).toBeOnTheScreen();

    const codeInput = screen.getByLabelText('Authenticator code');
    await fireEvent.changeText(codeInput, '654321');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Verify & sign in' }),
    );

    // Authenticated Home tab appears
    expect(
      await screen.findByText('Welcome back, jane@company.com'),
    ).toBeOnTheScreen();

    // Switch to Profile tab on the bottom navigation bar
    const profileTab = screen.getByLabelText('Profile tab');
    await fireEvent.press(profileTab);

    expect(
      await screen.findByRole('header', { name: 'jane@company.com' }),
    ).toBeOnTheScreen();
    expect(await screen.findByText('Kampala General Store')).toBeOnTheScreen();

    // Sign out from Profile tab
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(
      await screen.findByRole('header', { name: 'Sign in' }),
    ).toBeOnTheScreen();
  });

  it('completes account registration and displays confirmation email message', async () => {
    jest.spyOn(authApi, 'register').mockResolvedValueOnce({
      status: 'confirmation_sent',
      message: 'Please check your inbox to confirm your email.',
    });

    await render(<App />);

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Create an account' }),
    );

    expect(
      await screen.findByRole('header', { name: 'Create an account' }),
    ).toBeOnTheScreen();

    await fireEvent.changeText(
      screen.getByLabelText('Email address'),
      'newowner@company.com',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Password'),
      'password1234',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Confirm password'),
      'password1234',
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Create account' }),
    );

    expect(
      await screen.findByRole('header', { name: 'Check your email' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Please check your inbox to confirm your email.'),
    ).toBeOnTheScreen();
  });
});
