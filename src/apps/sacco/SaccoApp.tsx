import React from 'react';
import { RootNavigator } from './navigation/RootNavigator';
import { AppProviders } from './providers/AppProviders';

export function SaccoApp() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
