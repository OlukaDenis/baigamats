import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useMemo } from 'react';

import { authApi } from '../../features/auth/api/authApi';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { MfaVerifyScreen } from '../../features/auth/screens/MfaVerifyScreen';
import { RegisterScreen } from '../../features/auth/screens/RegisterScreen';
import { SplashScreen } from '../../features/auth/screens/SplashScreen';
import { useAuthStore } from '../../features/auth/store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import { MainTabNavigator } from './MainTabNavigator';
import type { AuthStackParamList } from './types';

type RootSwitchParamList = {
  Splash: undefined;
  MainTabs: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootSwitchStack = createNativeStackNavigator<RootSwitchParamList>();

export function RootNavigator() {
  const { scheme, colors } = useTheme();
  const status = useAuthStore(state => state.status);
  const hydrateAuth = useAuthStore(state => state.hydrateAuth);

  useEffect(() => {
    if (status === 'hydrating') {
      hydrateAuth(async refreshToken => {
        const res = await authApi.refreshSession({
          refresh_token: refreshToken,
        });
        return res.session;
      });
    }
  }, [status, hydrateAuth]);

  const navigationTheme = useMemo<Theme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.tertiary,
        notification: colors.secondary,
      },
    };
  }, [scheme, colors]);

  return (
    <NavigationContainer theme={navigationTheme}>
      {status === 'hydrating' ? (
        <RootSwitchStack.Navigator screenOptions={{ headerShown: false }}>
          <RootSwitchStack.Screen name="Splash" component={SplashScreen} />
        </RootSwitchStack.Navigator>
      ) : status === 'authenticated' ? (
        <RootSwitchStack.Navigator screenOptions={{ headerShown: false }}>
          <RootSwitchStack.Screen name="MainTabs" component={MainTabNavigator} />
        </RootSwitchStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="MfaVerify" component={MfaVerifyScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
