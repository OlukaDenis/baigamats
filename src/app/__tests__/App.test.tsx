import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { useAuthStore } from '../../features/auth/store/authStore';
import { usePreferencesStore } from '../../features/preferences/store/preferencesStore';
import { App } from '../App';

describe('App', () => {
  beforeEach(async () => {
    await act(async () => {
      await useAuthStore.getState().setAuthenticated({
        session: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: 1999999999,
        },
        user: {
          id: 'usr-1',
          email: 'owner@baigamats.com',
        },
        profile: {
          organization_id: 'org-1',
          role: 'admin',
        },
        needsOrganizationSetup: true,
      });
    });
  });

  afterEach(async () => {
    await act(async () => {
      usePreferencesStore.setState({ themePreference: 'system' });
      await useAuthStore.getState().clearAuth();
    });
  });

  it('renders the authenticated home screen and organization setup notice when needsOrganizationSetup is true', async () => {
    await render(<App />);

    expect(
      await screen.findByRole('header', { name: 'Baigamats' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('header', { name: 'Complete Organization Setup' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Primary action' }),
    ).toBeOnTheScreen();
  });

  it('lets the user change the theme preference', async () => {
    await render(<App />);

    const dark = await screen.findByRole('radio', { name: 'Dark' });
    expect(dark).not.toBeChecked();

    await fireEvent.press(dark);

    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'System' })).not.toBeChecked();
    expect(usePreferencesStore.getState().themePreference).toBe('dark');
  });
});
