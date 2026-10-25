import { RootNavigator } from './navigation/RootNavigator';
import { AppProviders } from './providers/AppProviders';

import { LogBox } from 'react-native';

LogBox.ignoreAllLogs();

export function App() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
