import { RootNavigator } from './navigation/RootNavigator';
import { AppProviders } from './providers/AppProviders';

export function App() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
