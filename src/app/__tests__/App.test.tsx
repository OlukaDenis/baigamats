import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { App } from '../App';
import { usePreferencesStore } from '../../features/preferences/store/preferencesStore';

describe('App', () => {
  afterEach(async () => {
    await act(() => {
      usePreferencesStore.setState({ themePreference: 'system' });
    });
  });

  it('renders the home screen', async () => {
    await render(<App />);

    expect(await screen.findByRole('header', { name: 'Baigamats' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Primary action' })).toBeOnTheScreen();
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
