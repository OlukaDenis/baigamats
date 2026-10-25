import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeIcon, UserCircleIcon } from 'react-native-heroicons/outline';

import { HomeScreen } from '../../features/home/screens/HomeScreen';
import { ProfileScreen } from '../../features/profile/screens/ProfileScreen';
import { useTheme } from '../../theme/ThemeProvider';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function renderHomeTabIcon({ color, size }: { color: string; size: number }) {
  return (
    <HomeIcon
      color={color}
      size={size}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

function renderProfileTabIcon({ color, size }: { color: string; size: number }) {
  return (
    <UserCircleIcon
      color={color}
      size={size}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

export function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.tertiary,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: renderHomeTabIcon,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarAccessibilityLabel: 'Profile tab',
          tabBarIcon: renderProfileTabIcon,
        }}
      />
    </Tab.Navigator>
  );
}
