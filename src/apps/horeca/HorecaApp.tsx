import React, { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { connectOnlineManager, createQueryClient } from '@shared/services/queryClient';
import { HorecaNavigator } from './navigation/HorecaNavigator';
import { HorecaThemeProvider } from './theme/colors';

export function HorecaApp() {
  const [client] = useState(createQueryClient);

  useEffect(() => connectOnlineManager(), []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <HorecaThemeProvider>
          <HorecaNavigator />
        </HorecaThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
