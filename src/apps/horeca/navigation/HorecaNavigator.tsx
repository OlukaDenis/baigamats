import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Keyboard,
  Pressable,
  StatusBar,
  View,
} from 'react-native';
import {
  ChartBarIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  UserIcon,
} from 'react-native-heroicons/outline';
import {
  ChartBarIcon as ChartBarSolidIcon,
  ShoppingBagIcon as ShoppingBagSolidIcon,
  Squares2X2Icon as Squares2X2SolidIcon,
  UserIcon as UserSolidIcon,
} from 'react-native-heroicons/solid';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Table } from '../api/schemas';
import { syncEngine } from '../db/syncEngine';
import { HorecaLoginScreen } from '../features/auth/screens/HorecaLoginScreen';
import { HorecaSplashScreen } from '../features/auth/screens/HorecaSplashScreen';
import { PinLockScreen } from '../features/auth/screens/PinLockScreen';
import { ProfileScreen } from '../features/auth/screens/ProfileScreen';
import { SetPinScreen } from '../features/auth/screens/SetPinScreen';
import { useBusinessProfile } from '../features/auth/hooks/useBusinessProfile';
import { useHorecaAuthStore } from '../features/auth/store/horecaAuthStore';
import {
  activityCaptureProps,
  getLastActivityAt,
  recordUserActivity,
  subscribeUserActivity,
} from '../features/auth/utils/inactivityTracker';
import { resolveIsManager } from '../features/auth/utils/roleAccess';
import { BackOfficeScreen } from '../features/backoffice/screens/BackOfficeScreen';
import { FloorPlanScreen } from '../features/floor/screens/FloorPlanScreen';
import { KitchenDisplayScreen } from '../features/kitchen/screens/KitchenDisplayScreen';
import { OrderEntryScreen } from '../features/orders/screens/OrderEntryScreen';
import { OrdersListScreen } from '../features/orders/screens/OrdersListScreen';
import { TableDetailsScreen } from '../features/orders/screens/TableDetailsScreen';
import { DigitalReceiptScreen } from '../features/payments/screens/DigitalReceiptScreen';
import {
  type CompletedPaymentResult,
  PaymentCheckoutScreen,
} from '../features/payments/screens/PaymentCheckoutScreen';
import { ReportsScreen } from '../features/reports/screens/ReportsScreen';
import { ShiftManagementScreen } from '../features/shifts/screens/ShiftManagementScreen';
import { useHorecaStore } from '../db/offlineStore';
import { useHorecaTheme } from '../theme/colors';
import { AppText } from '../components/atoms/AppText';

export type MainTab =
  | 'tables'
  | 'table'
  | 'orders_list'
  | 'order'
  | 'kitchen'
  | 'pay'
  | 'shift'
  | 'reports'
  | 'backoffice'
  | 'profile';

const BOTTOM_NAV_TABS: MainTab[] = [
  'tables',
  'orders_list',
  'reports',
  'profile',
];

export const HorecaNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useHorecaTheme();

  const status = useHorecaAuthStore(state => state.status);
  const activeStaff = useHorecaAuthStore(state => state.activeStaff);
  const me = useHorecaAuthStore(state => state.me);
  const loginProfile = useHorecaAuthStore(state => state.loginProfile);
  const lockTerminal = useHorecaAuthStore(state => state.lockTerminal);
  const autoLockSeconds = useHorecaAuthStore(state => state.autoLockSeconds);
  const hydrate = useHorecaAuthStore(state => state.hydrate);
  const setActiveOrderId = useHorecaStore(state => state.setActiveOrderId);
  const setActiveTableId = useHorecaStore(state => state.setActiveTableId);

  // Fetch & periodically refresh business profile after login
  useBusinessProfile(status === 'authenticated');

  // Screen stack for device back button and hierarchical navigation
  const [navStack, setNavStack] = useState<MainTab[]>(['tables']);
  const [isReceiptActive, setIsReceiptActive] = useState<boolean>(false);
  const [isSettingPin, setIsSettingPin] = useState<boolean>(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activePaymentOrderId, setActivePaymentOrderId] = useState<string | null>(null);
  const [activePaymentTotal, setActivePaymentTotal] = useState<number>(0);
  const [completedSale, setCompletedSale] = useState<CompletedPaymentResult | null>(null);
  const [isSplashDone, setIsSplashDone] = useState<boolean>(false);

  const currentTab = navStack[navStack.length - 1] ?? 'tables';

  // Minimum splash duration and auth hydration
  useEffect(() => {
    let isMounted = true;
    const initApp = async () => {
      const minDuration = new Promise<void>(resolve => setTimeout(() => resolve(), 500));
      await Promise.all([hydrate(), minDuration]);
      if (isMounted) {
        setIsSplashDone(true);
      }
    };

    initApp();
    syncEngine.start();
    return () => {
      isMounted = false;
      syncEngine.stop();
    };
  }, [hydrate]);

  // Reset navigation state when signed out so re-login always lands on Home
  useEffect(() => {
    if (status === 'unauthenticated') {
      setNavStack(['tables']);
      setIsSettingPin(false);
      setIsReceiptActive(false);
      setSelectedOrderId(null);
      setActivePaymentOrderId(null);
      setActivePaymentTotal(0);
      setCompletedSale(null);
    }
  }, [status]);

  // Auto-lock only after genuine user inactivity for configured seconds
  useEffect(() => {
    if (status !== 'authenticated') return;

    const timeoutMs = (autoLockSeconds || 360) * 1000;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleLockTimer = () => {
      if (timer) {
        clearTimeout(timer);
      }
      const elapsed = Date.now() - getLastActivityAt();
      const remaining = timeoutMs - elapsed;
      if (remaining <= 0) {
        lockTerminal();
        return;
      }

      timer = setTimeout(() => {
        const idleFor = Date.now() - getLastActivityAt();
        if (idleFor >= timeoutMs) {
          lockTerminal();
        } else {
          scheduleLockTimer();
        }
      }, remaining);
    };

    recordUserActivity(true);
    scheduleLockTimer();

    const unsubscribeActivity = subscribeUserActivity(scheduleLockTimer);
    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        scheduleLockTimer();
      }
    });
    const keyboardShowSub = Keyboard.addListener('keyboardDidShow', () => {
      recordUserActivity();
    });
    const keyboardHideSub = Keyboard.addListener('keyboardDidHide', () => {
      recordUserActivity();
    });

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      unsubscribeActivity();
      appStateSub.remove();
      keyboardShowSub.remove();
      keyboardHideSub.remove();
    };
  }, [status, autoLockSeconds, lockTerminal]);

  // Navigate to screen
  const navigateTo = useCallback((screen: MainTab) => {
    recordUserActivity();
    setNavStack(prev => {
      const active = prev[prev.length - 1];
      if (active === screen) return prev;

      // When switching to a bottom tab:
      if (BOTTOM_NAV_TABS.includes(screen)) {
        if (screen === 'tables') {
          return ['tables'];
        }
        return ['tables', screen];
      }

      // For non-main screens: push onto history stack
      return [...prev, screen];
    });
  }, []);

  const handleDoneReceipt = useCallback(() => {
    setIsReceiptActive(false);
    setCompletedSale(null);
    setActivePaymentOrderId(null);
    setSelectedOrderId(null);
    setNavStack(['tables']);
  }, []);

  /**
   * Device back button and on-screen back navigation handler.
   * Returns true if back action was handled within the app,
   * or false to permit default Android behavior (exiting app) when at root.
   */
  const handleBack = useCallback((): boolean => {
    recordUserActivity();
    // 1. If currently in the Set PIN modal screen, close it and stay on Profile
    if (isSettingPin) {
      setIsSettingPin(false);
      return true;
    }

    // 2. If viewing a digital receipt, finish receipt and return to tables
    if (isReceiptActive) {
      handleDoneReceipt();
      return true;
    }

    // 3. If there is navigation history to go back to (non-main screens or secondary tabs)
    if (navStack.length > 1) {
      const activeScreen = navStack[navStack.length - 1];

      // Clean up screen-specific state before popping
      if (activeScreen === 'order') {
        setSelectedOrderId(null);
      } else if (activeScreen === 'pay') {
        setActivePaymentOrderId(null);
        setCompletedSale(null);
      }

      setNavStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
      return true;
    }

    // 4. On root screen ('tables') with no sub-screens open:
    // Return false to allow Android system to handle back (exiting/backgrounding app)
    return false;
  }, [isSettingPin, isReceiptActive, navStack, handleDoneReceipt]);

  // Register device hardware back press listener
  const handleBackRef = useRef(handleBack);
  useEffect(() => {
    handleBackRef.current = handleBack;
  }, [handleBack]);

  useEffect(() => {
    const onHardwareBackPress = () => {
      return handleBackRef.current();
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBackPress
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Screen navigation actions
  const handleOpenOrder = (_table: Table) => {
    navigateTo('table');
  };

  const handleOpenOrdersScreen = () => {
    navigateTo('orders_list');
  };

  const handleViewTableOrder = (orderId?: string) => {
    if (orderId) {
      setSelectedOrderId(orderId);
      setActiveOrderId(orderId);
    }
    navigateTo('order');
  };

  const handleSelectOrderFromList = (order: { id: string; table_id?: string | null }) => {
    setSelectedOrderId(order.id);
    setActiveOrderId(order.id);
    if (order.table_id) {
      setActiveTableId(order.table_id);
    }
    navigateTo('order');
  };

  const handleOpenKitchen = () => {
    navigateTo('kitchen');
  };

  const handleOpenShift = () => {
    navigateTo('shift');
  };

  const handleOpenAdmin = () => {
    navigateTo('backoffice');
  };

  const handlePayNow = (orderId: string, total: number) => {
    setActivePaymentOrderId(orderId);
    setActiveOrderId(orderId);
    setActivePaymentTotal(total);
    setCompletedSale(null);
    setIsReceiptActive(false);
    navigateTo('pay');
  };

  const handlePaymentSuccess = (result: CompletedPaymentResult) => {
    setCompletedSale(result);
    setIsReceiptActive(true);
  };

  // Auth & splash gates
  if (status === 'hydrating' || !isSplashDone) {
    return (
      <>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <HorecaSplashScreen />
      </>
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

  const isManager = resolveIsManager({ loginProfile, me, activeStaff });

  const effectiveTab: MainTab =
    !isManager && (currentTab === 'reports' || currentTab === 'backoffice')
      ? 'tables'
      : currentTab;

  // Main screen routing
  const renderCurrentScreen = () => {
    if (isSettingPin) {
      return <SetPinScreen onBack={() => setIsSettingPin(false)} />;
    }

    switch (effectiveTab) {
      case 'tables':
        return (
          <FloorPlanScreen
            onOpenOrder={handleOpenOrder}
            onOrdersPress={handleOpenOrdersScreen}
            onOpenKitchen={handleOpenKitchen}
            onOpenShift={handleOpenShift}
            onLockTerminal={lockTerminal}
          />
        );
      case 'table':
        return (
          <TableDetailsScreen
            onViewOrder={handleViewTableOrder}
            onOrdersPress={handleOpenOrdersScreen}
            onBack={handleBack}
            onLockTerminal={lockTerminal}
          />
        );
      case 'orders_list':
        return (
          <OrdersListScreen
            onSelectOrder={handleSelectOrderFromList}
            onLockTerminal={lockTerminal}
            onNewOrderPress={() => navigateTo('tables')}
            onBack={handleBack}
          />
        );
      case 'order':
        return (
          <OrderEntryScreen
            orderId={selectedOrderId}
            onPayNow={handlePayNow}
            onKitchenFire={() => navigateTo('kitchen')}
            onLockTerminal={lockTerminal}
            onBack={handleBack}
          />
        );
      case 'kitchen':
        return (
          <KitchenDisplayScreen
            onBack={handleBack}
            onOrdersPress={handleOpenOrdersScreen}
          />
        );
      case 'pay':
        if (isReceiptActive) {
          return (
            <DigitalReceiptScreen
              saleInfo={completedSale}
              onDone={handleDoneReceipt}
              onLockTerminal={lockTerminal}
            />
          );
        }
        return (
          <PaymentCheckoutScreen
            orderId={activePaymentOrderId}
            totalAmount={activePaymentTotal}
            onPaymentSuccess={handlePaymentSuccess}
            onCancel={handleBack}
            onLockTerminal={lockTerminal}
          />
        );
      case 'shift':
        return (
          <ShiftManagementScreen
            onBack={handleBack}
            onOrdersPress={handleOpenOrdersScreen}
          />
        );
      case 'reports':
        return (
          <ReportsScreen
            onOrdersPress={handleOpenOrdersScreen}
            onLockTerminal={lockTerminal}
          />
        );
      case 'backoffice':
        return (
          <BackOfficeScreen
            onBack={handleBack}
            onOrdersPress={handleOpenOrdersScreen}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            onOrdersPress={handleOpenOrdersScreen}
            onLockTerminal={lockTerminal}
            onChangePin={() => setIsSettingPin(true)}
            onOpenAdmin={isManager ? handleOpenAdmin : undefined}
          />
        );
    }
  };

  const navItems = [
    { id: 'tables', label: 'Home', Icon: Squares2X2Icon, ActiveIcon: Squares2X2SolidIcon },
    { id: 'orders_list', label: 'Orders', Icon: ShoppingBagIcon, ActiveIcon: ShoppingBagSolidIcon },
    ...(isManager
      ? [{ id: 'reports', label: 'Reports', Icon: ChartBarIcon, ActiveIcon: ChartBarSolidIcon }]
      : []),
    { id: 'profile', label: 'Profile', Icon: UserIcon, ActiveIcon: UserSolidIcon },
  ];

  const isBottomNavVisible =
    !isSettingPin &&
    !isReceiptActive &&
    effectiveTab !== 'table' &&
    effectiveTab !== 'order' &&
    effectiveTab !== 'pay' &&
    effectiveTab !== 'kitchen' &&
    effectiveTab !== 'shift' &&
    effectiveTab !== 'backoffice';

  return (
    <View {...activityCaptureProps} className="flex-1 bg-background">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View className="flex-1">{renderCurrentScreen()}</View>

      {isBottomNavVisible ? (
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 6) }}
          className="flex-row items-center justify-around bg-surface border-t border-border pt-1.5 min-h-[58px]"
        >
          {navItems.map(item => {
            const isActive = effectiveTab === item.id;
            const ItemIcon = isActive ? item.ActiveIcon : item.Icon;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Navigate to ${item.label}`}
                onPress={() => navigateTo(item.id as MainTab)}
                className="flex-1 items-center justify-center py-1 active:opacity-70"
              >
                <ItemIcon
                  color={isActive ? colors.primary : colors.onSurfaceVariant}
                  size={20}
                />
                <AppText
                  variant="caption"
                  className={`text-[10px] mt-0.5 ${isActive ? 'text-primary font-bold' : 'text-text-secondary font-medium'
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
