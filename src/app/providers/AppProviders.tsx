import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { connectOnlineManager, createQueryClient } from '../../services/api/queryClient';
import { ThemeProvider, useTheme } from '../../theme/ThemeProvider';

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => connectOnlineManager(), []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ThemedStatusBar />
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
