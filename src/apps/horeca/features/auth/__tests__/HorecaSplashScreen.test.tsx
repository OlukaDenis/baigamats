import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { HorecaSplashScreen } from '../screens/HorecaSplashScreen';
import { HorecaThemeProvider } from '../../../theme/colors';

describe('HorecaSplashScreen', () => {
  it('renders the brand title, POS label, and default initializing message', async () => {
    await render(
      <HorecaThemeProvider>
        <HorecaSplashScreen />
      </HorecaThemeProvider>,
    );

    expect(screen.getByText('Baigamats HORECA')).toBeOnTheScreen();
    expect(screen.getByText('Point of Sale & Hospitality System')).toBeOnTheScreen();
    expect(screen.getByText('Initializing POS terminal...')).toBeOnTheScreen();
    expect(screen.getByText('Offline-First • Enterprise Hospitality POS')).toBeOnTheScreen();
  });

  it('renders custom initialization message when provided', async () => {
    await render(
      <HorecaThemeProvider>
        <HorecaSplashScreen message="Restoring cached orders & floor..." />
      </HorecaThemeProvider>,
    );

    expect(screen.getByText('Restoring cached orders & floor...')).toBeOnTheScreen();
  });
});
