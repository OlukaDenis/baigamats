import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../../theme/ThemeProvider';
import { memberAuthApi } from '../api/memberAuthApi';
import { MemberLoginScreen } from '../screens/MemberLoginScreen';
import { ChangePinScreen } from '../screens/ChangePinScreen';
import { useAuthStore } from '../store/authStore';
import { ApiError } from '../../../services/api/client';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn().mockReturnValue(true);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
    }),
    useRoute: () => ({ params: {} }),
  };
});

describe('Member Authentication Flows (Phase 1)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await act(async () => {
      await useAuthStore.getState().clearAuth();
    });
  });

  it('successfully signs in member with valid 4-digit PIN', async () => {
    const mockResponse = {
      session: {
        access_token: 'bmm_access_test_123',
        refresh_token: 'bmm_refresh_test_abc',
        token_type: 'bearer',
        expires_in: 900,
      },
      must_change_password: false,
      member: {
        id: 'mem_1',
        name: 'Sarah Nakato',
        member_no: 'M-1029',
        phone: '+256772123456',
      },
      organization: {
        id: 'org_1',
        name: 'Kagera Farmers SACCO',
        slug: 'kagera-sacco',
      },
    };

    const loginSpy = jest.spyOn(memberAuthApi, 'login').mockResolvedValueOnce(mockResponse);

    await render(
      <ThemeProvider>
        <MemberLoginScreen />
      </ThemeProvider>,
    );

    const orgInput = screen.getByLabelText('Cooperative Address / Slug');
    const memberNoInput = screen.getByLabelText('Member Number or Phone');
    const pinInput = screen.getByLabelText('Security PIN (4 or 5 digits)');
    const signInButton = screen.getByRole('button', { name: 'Sign In' });

    await fireEvent.changeText(orgInput, 'kagera-sacco');
    await fireEvent.changeText(memberNoInput, 'M-1029');
    await fireEvent.changeText(pinInput, '1234');

    await act(async () => {
      await fireEvent.press(signInButton);
    });

    expect(loginSpy).toHaveBeenCalledWith({
      org: 'kagera-sacco',
      member_no: 'M-1029',
      password: '1234',
    });

    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.authType).toBe('member');
    expect(state.member?.name).toBe('Sarah Nakato');
    expect(state.organization?.name).toBe('Kagera Farmers SACCO');
  });

  it('handles 409 session_active error gracefully', async () => {
    jest.spyOn(memberAuthApi, 'login').mockRejectedValueOnce(
      new ApiError(
        'Member signed in on another device',
        'http',
        409,
        undefined,
        'session_active',
      ),
    );

    await render(
      <ThemeProvider>
        <MemberLoginScreen />
      </ThemeProvider>,
    );

    const orgInput = screen.getByLabelText('Cooperative Address / Slug');
    const memberNoInput = screen.getByLabelText('Member Number or Phone');
    const pinInput = screen.getByLabelText('Security PIN (4 or 5 digits)');
    const signInButton = screen.getByRole('button', { name: 'Sign In' });

    await fireEvent.changeText(orgInput, 'kagera');
    await fireEvent.changeText(memberNoInput, 'M-1');
    await fireEvent.changeText(pinInput, '1234');

    await act(async () => {
      await fireEvent.press(signInButton);
    });

    expect(
      await screen.findByText(/signed in on another device/i),
    ).toBeOnTheScreen();
  });

  it('handles 403 account_locked error with branch notification', async () => {
    jest.spyOn(memberAuthApi, 'login').mockRejectedValueOnce(
      new ApiError(
        'Account locked',
        'http',
        403,
        undefined,
        'account_locked',
      ),
    );

    await render(
      <ThemeProvider>
        <MemberLoginScreen />
      </ThemeProvider>,
    );

    const orgInput = screen.getByLabelText('Cooperative Address / Slug');
    const memberNoInput = screen.getByLabelText('Member Number or Phone');
    const pinInput = screen.getByLabelText('Security PIN (4 or 5 digits)');
    const signInButton = screen.getByRole('button', { name: 'Sign In' });

    await fireEvent.changeText(orgInput, 'kagera');
    await fireEvent.changeText(memberNoInput, 'M-1');
    await fireEvent.changeText(pinInput, '1234');

    await act(async () => {
      await fireEvent.press(signInButton);
    });

    expect(
      await screen.findByText(/visit your cooperative branch/i),
    ).toBeOnTheScreen();
  });

  it('updates PIN successfully in ChangePinScreen', async () => {
    const changePasswordSpy = jest
      .spyOn(memberAuthApi, 'changePassword')
      .mockResolvedValueOnce({ ok: true });

    await render(
      <ThemeProvider>
        <ChangePinScreen />
      </ThemeProvider>,
    );

    const currentPinInput = screen.getByLabelText('Current PIN');
    const nextPinInput = screen.getByLabelText('New PIN (4 or 5 digits)');
    const confirmPinInput = screen.getByLabelText('Confirm New PIN');
    const updateButton = screen.getByRole('button', { name: 'Update PIN' });

    await fireEvent.changeText(currentPinInput, '1234');
    await fireEvent.changeText(nextPinInput, '5678');
    await fireEvent.changeText(confirmPinInput, '5678');

    await act(async () => {
      await fireEvent.press(updateButton);
    });

    expect(changePasswordSpy).toHaveBeenCalledWith({
      current: '1234',
      next: '5678',
    });

    expect(
      await screen.findByText(/updated successfully/i),
    ).toBeOnTheScreen();
  });
});
