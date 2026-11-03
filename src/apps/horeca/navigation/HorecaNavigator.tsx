import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  View,
} from 'react-native';
import {
  BanknotesIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  FireIcon,
  TableCellsIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Table } from '../api/schemas';
import { syncEngine } from '../db/syncEngine';
import { HorecaLoginScreen } from '../features/auth/screens/HorecaLoginScreen';
import { PinLockScreen } from '../features/auth/screens/PinLockScreen';
import { ProfileScreen } from '../features/auth/screens/ProfileScreen';
import { SetPinScreen } from '../features/auth/screens/SetPinScreen';
import { useHorecaAuthStore } from '../features/auth/store/horecaAuthStore';
import { BackOfficeScreen } from '../features/backoffice/screens/BackOfficeScreen';
import { FloorPlanScreen } from '../features/floor/screens/FloorPlanScreen';
import { KitchenDisplayScreen } from '../features/kitchen/screens/KitchenDisplayScreen';
import { OrderEntryScreen } from '../features/orders/screens/OrderEntryScreen';
import { TableDetailsScreen } from '../features/orders/screens/TableDetailsScreen';
import { DigitalReceiptScreen } from '../features/payments/screens/DigitalReceiptScreen';
import { PaymentCheckoutScreen } from '../features/payments/screens/PaymentCheckoutScreen';
import { ReportsScreen } from '../features/reports/screens/ReportsScreen';
import { ShiftManagementScreen } from '../features/shifts/screens/ShiftManagementScreen';
import { useHorecaTheme } from '../theme/colors';
import { AppText } from '../components/atoms/AppText';

type MainTab = 'tables' | 'table' | 'order' | 'kitchen' | 'pay' | 'shift' | 'reports' | 'backoffice' | 'profile';

export const HorecaNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useHorecaTheme();

  const status = useHorecaAuthStore(state => state.status);
  const activeStaff = useHorecaAuthStore(state => state.activeStaff);
  const lockTerminal = useHorecaAuthStore(state => state.lockTerminal);
  const hydrate = useHorecaAuthStore(state => state.hydrate);

  const [currentTab, setCurrentTab] = useState<MainTab>('tables');
  const [previousTab, setPreviousTab] = useState<MainTab>('tables');
  const [isReceiptActive, setIsReceiptActive] = useState<boolean>(false);
  const [isSettingPin, setIsSettingPin] = useState<boolean>(false);
  const [activePaymentTotal, setActivePaymentTotal] = useState<number>(540_000);

  useEffect(() => {
    hydrate();
    syncEngine.start();
    return () => syncEngine.stop();
  }, [hydrate]);

  // Auth gate
  if (status === 'hydrating') {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <HorecaLoginScreen />
      </>
    );
  }

  if (status === 'locked') {
    return (
      <>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <PinLockScreen />
      </>
    );
  }

  const handleOpenOrder = (_table: Table) => {
    setCurrentTab('table');
  };

  const handleOpenOrdersScreen = () => {
    if (currentTab !== 'order') {
      setPreviousTab(currentTab);
    }
    setCurrentTab('order');
  };

  const handleOpenProfile = () => {
    if (currentTab !== 'profile') {
      setPreviousTab(currentTab);
    }
    setCurrentTab('profile');
  };

  const handlePayNow = (total: number) => {
    setActivePaymentTotal(total);
    setIsReceiptActive(false);
    setCurrentTab('pay');
  };

  const handlePaymentSuccess = () => {
    setIsReceiptActive(true);
  };

  const handleDoneReceipt = () => {
    setIsReceiptActive(false);
    setCurrentTab('tables');
  };

  const isManager =
    activeStaff?.access === 'manager' ||
    activeStaff?.role === 'manager' ||
    activeStaff?.role === 'admin';

  // Main screen routing
  const renderCurrentScreen = () => {
    if (isSettingPin) {
      return <SetPinScreen onBack={() => setIsSettingPin(false)} />;
    }

    switch (currentTab) {
      case 'tables':
        return (
          <FloorPlanScreen
            onOpenOrder={handleOpenOrder}
            onOrdersPress={handleOpenOrdersScreen}
            onLockTerminal={lockTerminal}
            onProfilePress={handleOpenProfile}
          />
        );
      case 'table':
        return (
          <TableDetailsScreen
            onViewOrder={handleOpenOrdersScreen}
            onBack={() => setCurrentTab('tables')}
            onLockTerminal={lockTerminal}
            onProfilePress={handleOpenProfile}
          />
        );
      case 'order':
        return (
          <OrderEntryScreen
            onPayNow={handlePayNow}
            onKitchenFire={() => setCurrentTab('kitchen')}
            onLockTerminal={lockTerminal}
            onProfilePress={handleOpenProfile}
            onBack={() => setCurrentTab(previousTab === 'order' ? 'table' : previousTab)}
          />
        );
      case 'kitchen':
        return (
          <KitchenDisplayScreen
            onOrdersPress={handleOpenOrdersScreen}
            onLockTerminal={lockTerminal}
            onProfilePress={handleOpenProfile}
          />
        );
      case 'pay':
        if (isReceiptActive) {
          return (
            <DigitalReceiptScreen
              onDone={handleDoneReceipt}
              onLockTerminal={lockTerminal}
            />
          );
        }
        return (
          <PaymentCheckoutScreen
            totalAmount={activePaymentTotal}
            onPaymentSuccess={handlePaymentSuccess}
            onCancel={() => setCurrentTab('order')}
            onLockTerminal={lockTerminal}
          />
        );
      case 'shift':
        return (
          <ShiftManagementScreen
            onOrdersPress={handleOpenOrdersScreen}
            onLockTerminal={lockTerminal}
            onProfilePress={handleOpenProfile}
          />
        );
      case 'reports':
        return (
          <ReportsScreen
            onOrdersPress={handleOpenOrdersScreen}
            onLockTerminal={lockTerminal}
            onProfilePress={handleOpenProfile}
          />
        );
      case 'backoffice':
        return (
          <BackOfficeScreen
            onOrdersPress={handleOpenOrdersScreen}
            onLockTerminal={lockTerminal}
            onProfilePress={handleOpenProfile}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            onBack={() => setCurrentTab(previousTab === 'profile' ? 'tables' : previousTab)}
            onOrdersPress={handleOpenOrdersScreen}
            onChangePin={() => setIsSettingPin(true)}
          />
        );
    }
  };

  const navItems = [
    { id: 'tables', label: 'Tables', Icon: TableCellsIcon },
    { id: 'kitchen', label: 'Kitchen', Icon: FireIcon },
    { id: 'shift', label: 'Shift', Icon: BanknotesIcon },
    { id: 'reports', label: 'Reports', Icon: ChartBarIcon },
    ...(isManager ? [{ id: 'backoffice', label: 'Admin', Icon: Cog6ToothIcon }] : []),
  ];

  const isBottomNavVisible =
    !isSettingPin &&
    !isReceiptActive &&
    currentTab !== 'table' &&
    currentTab !== 'order' &&
    currentTab !== 'pay' &&
    currentTab !== 'profile';

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View className="flex-1">{renderCurrentScreen()}</View>

      {isBottomNavVisible ? (
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 6) }}
          className="flex-row items-center justify-around bg-surface border-t border-border pt-1.5 min-h-[58px]"
        >
          {navItems.map(item => {
            const isActive = currentTab === item.id;
            const ItemIcon = item.Icon;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Navigate to ${item.label}`}
                onPress={() => setCurrentTab(item.id as MainTab)}
                className="flex-1 items-center justify-center py-1 active:opacity-70"
              >
                <ItemIcon
                  color={isActive ? colors.primary : colors.onSurfaceVariant}
                  size={20}
                />
                <AppText
                  variant="caption"
                  className={`text-[10px] mt-0.5 ${
                    isActive ? 'text-primary font-bold' : 'text-text-secondary font-medium'
                  }`}
                >
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};
