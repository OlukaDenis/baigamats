import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useMemo } from 'react';

import { authApi } from '../../features/auth/api/authApi';
import { memberAuthApi } from '../../features/auth/api/memberAuthApi';
import { ChangePinScreen } from '../../features/auth/screens/ChangePinScreen';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { MemberLoginScreen } from '../../features/auth/screens/MemberLoginScreen';
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
  ChangePin: { isMandatory?: boolean } | undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootSwitchStack = createNativeStackNavigator<RootSwitchParamList>();

export function RootNavigator() {
  const { scheme, colors } = useTheme();
  const status = useAuthStore(state => state.status);
  const mustChangePassword = useAuthStore(state => state.mustChangePassword);
  const hydrateAuth = useAuthStore(state => state.hydrateAuth);

  useEffect(() => {
    if (status === 'hydrating') {
      hydrateAuth(async refreshToken => {
        const currentAuthType = useAuthStore.getState().authType;
        if (currentAuthType === 'member') {
          const res = await memberAuthApi.refresh({
            refresh_token: refreshToken,
          });
          return res.session;
        } else {
          const res = await authApi.refreshSession({
            refresh_token: refreshToken,
          });
          return res.session;
        }
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
        text: colors.textPrimary,
        border: colors.border,
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
        mustChangePassword ? (
          <RootSwitchStack.Navigator screenOptions={{ headerShown: false }}>
            <RootSwitchStack.Screen
              name="ChangePin"
              component={ChangePinScreen}
              initialParams={{ isMandatory: true }}
            />
          </RootSwitchStack.Navigator>
        ) : (
          <RootSwitchStack.Navigator screenOptions={{ headerShown: false }}>
            <RootSwitchStack.Screen name="MainTabs" component={MainTabNavigator} />
          </RootSwitchStack.Navigator>
        )
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="MemberLogin" component={MemberLoginScreen} />
          <AuthStack.Screen name="ChangePin" component={ChangePinScreen} />
          <AuthStack.Screen name="MfaVerify" component={MfaVerifyScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
