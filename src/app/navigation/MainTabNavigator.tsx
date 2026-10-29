import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  ArrowDownLeftIcon as DepositOutlineIcon,
  ArrowsRightLeftIcon as TransferOutlineIcon,
  DocumentTextIcon as DocumentTextOutlineIcon,
  HomeIcon as HomeOutlineIcon,
  ScaleIcon as LoansOutlineIcon,
  UserCircleIcon as UserCircleOutlineIcon,
} from 'react-native-heroicons/outline';
import {
  ArrowDownLeftIcon as DepositSolidIcon,
  ArrowsRightLeftIcon as TransferSolidIcon,
  DocumentTextIcon as DocumentTextSolidIcon,
  HomeIcon as HomeSolidIcon,
  ScaleIcon as LoansSolidIcon,
  UserCircleIcon as UserCircleSolidIcon,
} from 'react-native-heroicons/solid';

import { DepositScreen } from '../../features/deposits/screens/DepositScreen';
import { HomeScreen } from '../../features/home/screens/HomeScreen';
import { LoansScreen } from '../../features/loans/screens/LoansScreen';
import { StatementScreen } from '../../features/memberAccount/screens/StatementScreen';
import { ProfileScreen } from '../../features/profile/screens/ProfileScreen';
import { TransferScreen } from '../../features/transfers/screens/TransferScreen';
import { useTheme } from '../../theme/ThemeProvider';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function renderHomeTabIcon({
  focused,
  color,
  size,
}: {
  focused: boolean;
  color: string;
  size: number;
}) {
  const Icon = focused ? HomeSolidIcon : HomeOutlineIcon;
  return (
    <View
      className={
        focused
          ? 'items-center justify-center rounded-full bg-border/40 px-3.5 py-1'
          : 'items-center justify-center px-3.5 py-1'
      }
    >
      <Icon
        color={color}
        size={size}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

function renderDepositTabIcon({
  focused,
  color,
  size,
}: {
  focused: boolean;
  color: string;
  size: number;
}) {
  const Icon = focused ? DepositSolidIcon : DepositOutlineIcon;
  return (
    <View
      className={
        focused
          ? 'items-center justify-center rounded-full bg-border/40 px-3.5 py-1'
          : 'items-center justify-center px-3.5 py-1'
      }
    >
      <Icon
        color={color}
        size={size}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

function renderTransferTabIcon({
  focused,
  color,
  size,
}: {
  focused: boolean;
  color: string;
  size: number;
}) {
  const Icon = focused ? TransferSolidIcon : TransferOutlineIcon;
  return (
    <View
      className={
        focused
          ? 'items-center justify-center rounded-full bg-border/40 px-3.5 py-1'
          : 'items-center justify-center px-3.5 py-1'
      }
    >
      <Icon
        color={color}
        size={size}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

function renderLoansTabIcon({
  focused,
  color,
  size,
}: {
  focused: boolean;
  color: string;
  size: number;
}) {
  const Icon = focused ? LoansSolidIcon : LoansOutlineIcon;
  return (
    <View
      className={
        focused
          ? 'items-center justify-center rounded-full bg-border/40 px-3.5 py-1'
          : 'items-center justify-center px-3.5 py-1'
      }
    >
      <Icon
        color={color}
        size={size}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

function renderStatementTabIcon({
  focused,
  color,
  size,
}: {
  focused: boolean;
  color: string;
  size: number;
}) {
  const Icon = focused ? DocumentTextSolidIcon : DocumentTextOutlineIcon;
  return (
    <View
      className={
        focused
          ? 'items-center justify-center rounded-full bg-border/40 px-3.5 py-1'
          : 'items-center justify-center px-3.5 py-1'
      }
    >
      <Icon
        color={color}
        size={size}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

function renderProfileTabIcon({
  focused,
  color,
  size,
}: {
  focused: boolean;
  color: string;
  size: number;
}) {
  const Icon = focused ? UserCircleSolidIcon : UserCircleOutlineIcon;
  return (
    <View
      className={
        focused
          ? 'items-center justify-center rounded-full bg-border/40 px-3.5 py-1'
          : 'items-center justify-center px-3.5 py-1'
      }
    >
      <Icon
        color={color}
        size={size}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

export function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          minHeight: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
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
        name="Deposit"
        component={DepositScreen}
        options={{
          tabBarLabel: 'Deposit',
          tabBarAccessibilityLabel: 'Deposit tab',
          tabBarIcon: renderDepositTabIcon,
        }}
      />
      <Tab.Screen
        name="Transfer"
        component={TransferScreen}
        options={{
          tabBarLabel: 'Transfer',
          tabBarAccessibilityLabel: 'Transfer tab',
          tabBarIcon: renderTransferTabIcon,
        }}
      />
      <Tab.Screen
        name="Loans"
        component={LoansScreen}
        options={{
          tabBarLabel: 'Loans',
          tabBarAccessibilityLabel: 'Loans tab',
          tabBarIcon: renderLoansTabIcon,
        }}
      />
      <Tab.Screen
        name="Statement"
        component={StatementScreen}
        options={{
          tabBarLabel: 'Statement',
          tabBarAccessibilityLabel: 'Statement tab',
          tabBarIcon: renderStatementTabIcon,
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
