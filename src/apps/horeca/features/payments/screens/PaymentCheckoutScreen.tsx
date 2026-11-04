import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  Switch,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from 'react-native-heroicons/outline';
import { useQueryClient } from '@tanstack/react-query';
import { horecaApi } from '@horeca/api/horecaApiClient';
import type { PaymentStatus, StartPaymentResponse } from '@horeca/api/schemas';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { syncEngine } from '@horeca/db/syncEngine';
import { HORECA_TABLES_QUERY_KEY } from '@horeca/features/floor/hooks/useFloorTables';
import { HORECA_OPEN_ORDERS_QUERY_KEY } from '@horeca/features/orders/hooks/useOpenOrders';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { AlertBanner } from '@horeca/components/molecules/AlertBanner';
import { HorecaSubAppBar } from '@horeca/components/organisms/HorecaSubAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';

export interface CompletedPaymentResult {
  orderId: string;
  method: 'cash' | 'mobile_money';
  amount: number;
  saleId?: string | null;
  saleNumber?: string | null;
  paymentId?: string | null;
}

interface PaymentCheckoutScreenProps {
  orderId?: string | null;
  totalAmount?: number;
  onPaymentSuccess: (result: CompletedPaymentResult) => void;
  onCancel: () => void;
  onLockTerminal: () => void;
}

/**
 * Normalizes a Ugandan phone input into standard 10-digit format (e.g. "0773047940").
 */
export function normalizeUgandaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('256') && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('3'))) {
    return `0${digits}`;
  }
  return digits;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const PaymentCheckoutScreen: React.FC<PaymentCheckoutScreenProps> = ({
  orderId: propOrderId,
  totalAmount = 0,
  onPaymentSuccess,
  onCancel,
}) => {
  const colors = useHorecaColors();
  const queryClient = useQueryClient();

  const completeOrderSettlement = useHorecaStore(state => state.completeOrderSettlement);
  const activeOrderId = useHorecaStore(state => state.activeOrderId);
  const activeTableId = useHorecaStore(state => state.activeTableId);
  const setActiveOrderId = useHorecaStore(state => state.setActiveOrderId);
  const setOrders = useHorecaStore(state => state.setOrders);
  const tables = useHorecaStore(state => state.tables);
  const orders = useHorecaStore(state => state.orders);

  // Resolve order and orderId
  const currentOrder = useMemo(() => {
    if (propOrderId && orders[propOrderId]) {
      return orders[propOrderId];
    }
    if (activeOrderId && orders[activeOrderId]) {
      return orders[activeOrderId];
    }
    return (
      Object.values(orders).find(
        o => !o.id.startsWith('temp-ord-') && o.table_id === activeTableId && o.status === 'open',
      ) ??
      Object.values(orders).find(o => !o.id.startsWith('temp-ord-') && o.status === 'open') ??
      Object.values(orders).find(o => o.status === 'open')
    );
  }, [propOrderId, activeOrderId, activeTableId, orders]);

  const [resolvedOrderId, setResolvedOrderId] = useState<string | null>(
    () => propOrderId || currentOrder?.id || activeOrderId || null,
  );
  const [isFetchingOrderId, setIsFetchingOrderId] = useState<boolean>(false);

  // Ensure we always have a real server orderId on the payment screen
  useEffect(() => {
    const candidate = propOrderId || currentOrder?.id || activeOrderId;
    if (candidate && !candidate.startsWith('temp-ord-')) {
      setResolvedOrderId(candidate);
      return;
    }

    let mounted = true;
    (async () => {
      setIsFetchingOrderId(true);
      try {
        await syncEngine.processOutbox();
        const res = await horecaApi.getOrders({ mine: true, status: 'open' });
        const list = Array.isArray(res) ? res : (res?.items ?? []);
        if (mounted && list.length > 0) {
          setOrders(list);
          const match =
            list.find(o => o.table_id === activeTableId && o.status === 'open') ?? list[0];
          if (match?.id) {
            setResolvedOrderId(match.id);
            setActiveOrderId(match.id);
          }
        }
      } catch {
        // Retain candidate if offline
      } finally {
        if (mounted) {
          setIsFetchingOrderId(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [propOrderId, currentOrder?.id, activeOrderId, activeTableId, setOrders, setActiveOrderId]);

  const activeTable =
    tables.find(t => t.id === (currentOrder?.table_id ?? activeTableId)) ?? tables[0];

  const resolvedTotal =
    totalAmount > 0
      ? totalAmount
      : (currentOrder?.total_amount ??
        (currentOrder?.items ?? []).reduce((sum, it) => sum + it.unit_price * it.qty, 0));

  // Payment method tab: 'cash' | 'momo'
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'momo'>('cash');

  // Cash state
  const [cashTenderedInput, setCashTenderedInput] = useState<string>(() =>
    String(resolvedTotal),
  );
  const [triggerDrawer, setTriggerDrawer] = useState<boolean>(true);
  const [isProcessingCash, setIsProcessingCash] = useState<boolean>(false);
  const [cashError, setCashError] = useState<string | null>(null);

  useEffect(() => {
    if (resolvedTotal > 0) {
      setCashTenderedInput(String(resolvedTotal));
    }
  }, [resolvedTotal]);

  // Mobile Money state
  const [selectedNetwork, setSelectedNetwork] = useState<'mtn' | 'airtel'>('mtn');
  const [phoneNumber, setPhoneNumber] = useState<string>('0773047940');
  const [isInitiatingMomo, setIsInitiatingMomo] = useState<boolean>(false);
  const [momoError, setMomoError] = useState<string | null>(null);
  const [momoSession, setMomoSession] = useState<StartPaymentResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Pulse animation for the sleek waiting UI
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hasFinalizedRef = useRef<boolean>(false);

  const currentMomoState = paymentStatus?.state ?? momoSession?.state ?? null;

  useEffect(() => {
    if (currentMomoState === 'pending') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.16,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [currentMomoState, pulseAnim]);

  // Elapsed timer while waiting for Mobile Money payment
  useEffect(() => {
    if (!momoSession || currentMomoState !== 'pending') return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [momoSession, currentMomoState]);

  const cashTendered = parseInt(cashTenderedInput.replace(/\D/g, ''), 10) || 0;
  const changeDue = Math.max(0, cashTendered - resolvedTotal);

  const finalizeOrderSuccess = useCallback(
    (result: CompletedPaymentResult, status: 'billed' | 'paid') => {
      if (hasFinalizedRef.current) return;
      hasFinalizedRef.current = true;
      completeOrderSettlement(result.orderId, status);
      queryClient.invalidateQueries({ queryKey: HORECA_OPEN_ORDERS_QUERY_KEY }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: HORECA_TABLES_QUERY_KEY }).catch(() => {});
      onPaymentSuccess(result);
    },
    [completeOrderSettlement, onPaymentSuccess, queryClient],
  );

  // ==========================================
  // Cash Payment: POST /orders/:orderId/bill
  // ==========================================
  const handleCashTender = async () => {
    setCashError(null);

    if (!resolvedOrderId || resolvedOrderId.startsWith('temp-ord-')) {
      Alert.alert(
        'Order ID Required',
        'Unable to resolve the open order ID for this payment. Please return to the Order screen to sync.',
      );
      return;
    }

    if (cashTendered < resolvedTotal) {
      Alert.alert(
        'Insufficient Cash',
        `Tendered amount (UGX ${cashTendered.toLocaleString()}) is less than the order total (UGX ${resolvedTotal.toLocaleString()}).`,
      );
      return;
    }

    setIsProcessingCash(true);
    try {
      const res = await horecaApi.billCash(resolvedOrderId, {
        paymentMethod: 'cash',
      });

      finalizeOrderSuccess(
        {
          orderId: res.orderId || resolvedOrderId,
          method: 'cash',
          amount: resolvedTotal,
          saleId: res.saleId,
          saleNumber: res.saleNumber,
        },
        'billed',
      );
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to complete cash bill. Please try again.';
      setCashError(apiMsg);
    } finally {
      setIsProcessingCash(false);
    }
  };

  // ==========================================
  // Mobile Money Step 1: POST /orders/:orderId/payments
  // ==========================================
  const handleInitiateMoMo = async () => {
    setMomoError(null);

    if (!resolvedOrderId || resolvedOrderId.startsWith('temp-ord-')) {
      Alert.alert(
        'Order ID Required',
        'Unable to resolve the open order ID for this payment. Please return to the Order screen to sync.',
      );
      return;
    }

    const normalizedPhone = normalizeUgandaPhone(phoneNumber);
    if (!/^0\d{9}$/.test(normalizedPhone)) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid 10-digit mobile number (e.g. 0773047940).',
      );
      return;
    }

    setIsInitiatingMomo(true);
    hasFinalizedRef.current = false;
    try {
      const session = await horecaApi.startPayment(resolvedOrderId, {
        method: 'mobile_money',
        phoneNumber: normalizedPhone,
      });

      setPhoneNumber(normalizedPhone);
      setMomoSession(session);
      setElapsedSeconds(0);
      setPaymentStatus({
        orderId: session.orderId || resolvedOrderId,
        paymentId: session.paymentId,
        state: session.state,
        message: null,
        amount: session.amount,
      });

      if (session.state === 'paid') {
        finalizeOrderSuccess(
          {
            orderId: session.orderId || resolvedOrderId,
            method: 'mobile_money',
            amount: session.amount || resolvedTotal,
            paymentId: session.paymentId,
          },
          'paid',
        );
      }
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to initiate Mobile Money payment. Please verify the number and try again.';
      setMomoError(apiMsg);
    } finally {
      setIsInitiatingMomo(false);
    }
  };

  // ==========================================
  // Mobile Money Step 2: GET /orders/:orderId/payments/:paymentId
  // ==========================================
  const checkMomoPaymentStatus = useCallback(
    async (manual = false) => {
      if (!momoSession?.paymentId) return;
      const targetOrderId = momoSession.orderId || resolvedOrderId;
      if (!targetOrderId) return;

      if (manual) {
        setIsCheckingStatus(true);
      }
      try {
        const statusRes = await horecaApi.getPaymentStatus(
          targetOrderId,
          momoSession.paymentId,
        );
        setPaymentStatus(statusRes);

        if (statusRes.state === 'paid') {
          setTimeout(() => {
            finalizeOrderSuccess(
              {
                orderId: statusRes.orderId || targetOrderId,
                method: 'mobile_money',
                amount: statusRes.amount || momoSession.amount || resolvedTotal,
                saleId: statusRes.saleId,
                saleNumber: statusRes.saleNumber,
                paymentId: statusRes.paymentId,
              },
              'paid',
            );
          }, 900);
        }
      } catch (err: any) {
        if (manual) {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            'Could not check payment status right now.';
          setMomoError(msg);
        }
      } finally {
        if (manual) {
          setIsCheckingStatus(false);
        }
      }
    },
    [momoSession, resolvedOrderId, resolvedTotal, finalizeOrderSuccess],
  );

  // Automatic polling while payment state is pending
  useEffect(() => {
    if (!momoSession?.paymentId || currentMomoState !== 'pending') {
      return;
    }

    const timer = setInterval(() => {
      checkMomoPaymentStatus(false);
    }, 3000);

    return () => clearInterval(timer);
  }, [momoSession?.paymentId, currentMomoState, checkMomoPaymentStatus]);

  const handleResetMomoSession = () => {
    setMomoSession(null);
    setPaymentStatus(null);
    setMomoError(null);
    setElapsedSeconds(0);
  };

  const isCash = selectedMethod === 'cash';
  const isMomo = selectedMethod === 'momo';

  return (
    <ScreenTemplate
      scrollable
      withBottomInset
      className="bg-background"
      header={
        <HorecaSubAppBar title="Checkout & Payment" onBack={onCancel} onOrdersPress={onCancel} />
      }
      contentContainerClassName="px-4 py-5"
    >
      {/* Settlement Summary Card */}
      <View className="rounded-3xl bg-surface border border-border p-5 mb-5">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1 mr-2">
            <AppText variant="label" className="font-bold text-text">
              Table {activeTable?.table_number ?? '01'} • {activeTable?.section ?? 'Main Dining'}
            </AppText>
            <AppText variant="caption" className="text-text-secondary text-[11px] mt-0.5">
              {currentOrder?.order_number
                ? `Order ${currentOrder.order_number}`
                : 'Active Order'}{' '}
              {resolvedOrderId ? `• ID: ${resolvedOrderId.slice(0, 8)}...` : ''}
            </AppText>
          </View>
          <Badge
            label={`${currentOrder?.party_size ?? activeTable?.capacity ?? 2} GUESTS`}
            variant="primary"
            size="sm"
          />
        </View>

        {isFetchingOrderId ? (
          <View className="flex-row items-center my-1">
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption" className="text-text-secondary ml-2">
              Syncing open order ID...
            </AppText>
          </View>
        ) : null}

        <AppText variant="caption" className="text-text-secondary uppercase font-semibold text-[11px] mt-1">
          Total Settlement Due
        </AppText>
        <AppText variant="display" className="text-3xl font-extrabold text-primary my-1">
          UGX {resolvedTotal.toLocaleString()}
        </AppText>
      </View>

      {/* Payment Method Switch Tabs */}
      <View className="flex-row p-1 bg-surface border border-border rounded-2xl mb-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pay with Cash"
          disabled={currentMomoState === 'pending'}
          onPress={() => setSelectedMethod('cash')}
          style={{ backgroundColor: isCash ? colors.primary : 'transparent' }}
          className="flex-1 py-3 rounded-xl flex-row items-center justify-center"
        >
          <View className="mr-2">
            <BanknotesIcon
              color={isCash ? colors.onPrimary : colors.onSurfaceVariant}
              size={20}
            />
          </View>
          <AppText
            variant="label"
            style={{ color: isCash ? colors.onPrimary : colors.onSurface }}
            className="font-bold"
          >
            Cash Payment
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pay with Mobile Money"
          onPress={() => setSelectedMethod('momo')}
          style={{ backgroundColor: isMomo ? colors.primary : 'transparent' }}
          className="flex-1 py-3 rounded-xl flex-row items-center justify-center"
        >
          <View className="mr-2">
            <DevicePhoneMobileIcon
              color={isMomo ? colors.onPrimary : colors.onSurfaceVariant}
              size={20}
            />
          </View>
          <AppText
            variant="label"
            style={{ color: isMomo ? colors.onPrimary : colors.onSurface }}
            className="font-bold"
          >
            Mobile Money
          </AppText>
        </Pressable>
      </View>

      {/* CASH PAYMENT VIEW */}
      {isCash ? (
        <View className="rounded-3xl bg-surface border border-border p-5 mb-5">
          {cashError ? (
            <AlertBanner severity="error" message={cashError} className="mb-4" />
          ) : null}

          {/* Editable Received Cash Input */}
          <View className="mb-4">
            <AppText variant="caption" className="text-text-secondary font-semibold uppercase text-[11px] mb-1.5">
              Cash Tendered (UGX)
            </AppText>
            <View className="flex-row items-center rounded-xl bg-background border border-border px-4 py-1.5">
              <AppText variant="label" className="font-bold text-primary mr-2">
                UGX
              </AppText>
              <TextInput
                value={cashTenderedInput}
                onChangeText={txt => setCashTenderedInput(txt.replace(/[^\d]/g, ''))}
                keyboardType="numeric"
                placeholder={String(resolvedTotal)}
                placeholderTextColor={colors.onSurfaceVariant}
                style={{ color: colors.onSurface }}
                className="flex-1 text-lg font-bold py-1.5"
              />
            </View>
          </View>

          {/* Change Due Card */}
          <View className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex-row items-center justify-between mb-4">
            <View>
              <AppText variant="label" className="font-bold text-primary">
                Change Due Customer
              </AppText>
              <AppText variant="caption" className="text-text-secondary">
                Return cash to guest
              </AppText>
            </View>
            <AppText variant="title" className="text-xl font-extrabold text-primary">
              UGX {changeDue.toLocaleString()}
            </AppText>
          </View>

          {/* Kick Drawer Switch */}
          <View className="flex-row items-center justify-between py-2 mb-4">
            <AppText variant="label" className="text-text font-medium">
              Trigger Physical Cash Drawer Kick
            </AppText>
            <Switch
              value={triggerDrawer}
              onValueChange={setTriggerDrawer}
              trackColor={{ false: colors.surfaceDim, true: colors.primary }}
              thumbColor={colors.onPrimary}
            />
          </View>

          {/* Final Cash Tender CTA */}
          <Button
            label={`Complete Cash Sale • UGX ${resolvedTotal.toLocaleString()}`}
            variant="primary"
            size="lg"
            onPress={handleCashTender}
            loading={isProcessingCash}
            disabled={isFetchingOrderId}
          />
        </View>
      ) : momoSession ? (
        /* SLEEK MOBILE MONEY WAITING & STATUS UI */
        <View className="rounded-3xl bg-surface border border-border p-5 mb-5 shadow-sm">
          {/* Status Header with Animated Pulse */}
          <View className="items-center pt-2 pb-5 border-b border-border/50">
            <View className="items-center justify-center mb-3.5">
              {currentMomoState === 'pending' ? (
                <View className="items-center justify-center">
                  <Animated.View
                    style={{
                      transform: [{ scale: pulseAnim }],
                      backgroundColor: `${colors.primary}20`,
                    }}
                    className="absolute h-20 w-20 rounded-full"
                  />
                  <View className="h-16 w-16 rounded-full bg-primary/15 border-2 border-primary items-center justify-center">
                    <DevicePhoneMobileIcon color={colors.primary} size={30} />
                  </View>
                </View>
              ) : currentMomoState === 'paid' ? (
                <View className="h-16 w-16 rounded-full bg-status-available/15 border-2 border-status-available items-center justify-center">
                  <CheckCircleIcon color={colors.statusAvailable} size={34} />
                </View>
              ) : (
                <View className="h-16 w-16 rounded-full bg-error/15 border-2 border-error items-center justify-center">
                  <XCircleIcon color={colors.error} size={34} />
                </View>
              )}
            </View>

            {/* Status Pill & Timer */}
            <View className="flex-row items-center mb-2">
              {currentMomoState === 'pending' ? (
                <View className="flex-row items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/25">
                  <ClockIcon color={colors.primary} size={14} />
                  <AppText variant="caption" className="text-primary font-bold ml-1.5 text-xs">
                    AWAITING PIN • {formatElapsed(elapsedSeconds)}
                  </AppText>
                </View>
              ) : currentMomoState === 'paid' ? (
                <View className="flex-row items-center px-3 py-1 rounded-full bg-status-available/15 border border-status-available/30">
                  <ShieldCheckIcon color={colors.statusAvailable} size={14} />
                  <AppText variant="caption" className="text-status-available font-bold ml-1.5 text-xs">
                    PAYMENT CONFIRMED
                  </AppText>
                </View>
              ) : (
                <View className="flex-row items-center px-3 py-1 rounded-full bg-error/15 border border-error/30">
                  <ExclamationTriangleIcon color={colors.error} size={14} />
                  <AppText variant="caption" className="text-error font-bold ml-1.5 text-xs">
                    PAYMENT {currentMomoState?.toUpperCase()}
                  </AppText>
                </View>
              )}
            </View>

            <AppText variant="title" className="text-xl font-extrabold text-text text-center">
              {currentMomoState === 'pending'
                ? 'Waiting for Customer Approval'
                : currentMomoState === 'paid'
                  ? 'Mobile Money Received!'
                  : 'Payment Could Not Complete'}
            </AppText>

            <AppText
              variant="caption"
              className="text-text-secondary text-center mt-1 max-w-xs"
            >
              {currentMomoState === 'pending'
                ? `An STK prompt has been sent to ${phoneNumber}. Ask the customer to enter their Mobile Money PIN.`
                : currentMomoState === 'paid'
                  ? paymentStatus?.saleNumber
                    ? `Sale ${paymentStatus.saleNumber} has been recorded.`
                    : 'Transaction verified and order settled.'
                  : paymentStatus?.message ||
                    'The prompt was declined, timed out, or failed on the network.'}
            </AppText>
          </View>

          {/* Charge & Fee Breakdown Card */}
          <View className="my-4 p-4 rounded-2xl bg-background border border-border">
            <View className="flex-row items-center justify-between mb-2">
              <AppText variant="caption" className="text-text-secondary">
                Customer Number
              </AppText>
              <View className="flex-row items-center">
                <PhoneIcon color={colors.primary} size={13} />
                <AppText variant="label" className="font-bold text-text ml-1">
                  {phoneNumber}
                </AppText>
              </View>
            </View>

            <View className="flex-row items-center justify-between mb-2">
              <AppText variant="caption" className="text-text-secondary">
                Order Amount
              </AppText>
              <AppText variant="label" className="font-semibold text-text">
                UGX {(momoSession.amount ?? resolvedTotal).toLocaleString()}
              </AppText>
            </View>

            {typeof momoSession.feeAmount === 'number' ? (
              <View className="flex-row items-center justify-between mb-2">
                <AppText variant="caption" className="text-text-secondary">
                  Mobile Money Fee
                </AppText>
                <AppText variant="label" className="font-semibold text-text">
                  UGX {momoSession.feeAmount.toLocaleString()}
                </AppText>
              </View>
            ) : null}

            <View className="flex-row items-center justify-between pt-2.5 mt-1 border-t border-border/60">
              <AppText variant="label" className="font-bold text-text">
                Total Charge on Phone
              </AppText>
              <AppText variant="title" className="font-extrabold text-primary text-lg">
                UGX{' '}
                {(
                  momoSession.chargeAmount ??
                  momoSession.amount ??
                  resolvedTotal
                ).toLocaleString()}
              </AppText>
            </View>
          </View>

          {/* 3-Step Live Progress Stepper */}
          <View className="mb-5 px-1">
            {/* Step 1 */}
            <View className="flex-row items-center mb-3">
              <View className="h-6 w-6 rounded-full bg-status-available items-center justify-center mr-3">
                <CheckCircleIcon color="#ffffff" size={15} />
              </View>
              <View className="flex-1">
                <AppText variant="label" className="text-text font-bold text-xs">
                  1. Payment Request Initiated
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-[11px]">
                  Ref: {momoSession.paymentId.slice(0, 12)}...
                </AppText>
              </View>
            </View>

            {/* Step 2 */}
            <View className="flex-row items-center mb-3">
              {currentMomoState === 'pending' ? (
                <View className="h-6 w-6 rounded-full bg-primary/15 border border-primary items-center justify-center mr-3">
                  <ActivityIndicator size="small" color={colors.primary} style={{ transform: [{ scale: 0.65 }] }} />
                </View>
              ) : currentMomoState === 'paid' ? (
                <View className="h-6 w-6 rounded-full bg-status-available items-center justify-center mr-3">
                  <CheckCircleIcon color="#ffffff" size={15} />
                </View>
              ) : (
                <View className="h-6 w-6 rounded-full bg-error items-center justify-center mr-3">
                  <XCircleIcon color="#ffffff" size={15} />
                </View>
              )}
              <View className="flex-1">
                <AppText variant="label" className="text-text font-bold text-xs">
                  2. Customer PIN Authorization
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-[11px]">
                  {currentMomoState === 'pending'
                    ? 'Auto-checking payment status every 3s...'
                    : currentMomoState === 'paid'
                      ? 'Authorized by customer'
                      : paymentStatus?.message || 'Authorization failed or cancelled'}
                </AppText>
              </View>
            </View>

            {/* Step 3 */}
            <View className="flex-row items-center">
              {currentMomoState === 'paid' ? (
                <View className="h-6 w-6 rounded-full bg-status-available items-center justify-center mr-3">
                  <CheckCircleIcon color="#ffffff" size={15} />
                </View>
              ) : (
                <View className="h-6 w-6 rounded-full bg-background border border-border items-center justify-center mr-3">
                  <AppText variant="caption" className="text-text-secondary font-bold text-[10px]">
                    3
                  </AppText>
                </View>
              )}
              <View className="flex-1">
                <AppText
                  variant="label"
                  className={`font-bold text-xs ${
                    currentMomoState === 'paid' ? 'text-text' : 'text-text-secondary'
                  }`}
                >
                  3. Sale Confirmed & Receipt Ready
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-[11px]">
                  {paymentStatus?.saleNumber
                    ? `Sale Number: ${paymentStatus.saleNumber}`
                    : 'Generates sale number upon completion'}
                </AppText>
              </View>
            </View>
          </View>

          {momoError ? (
            <AlertBanner severity="error" message={momoError} className="mb-4" />
          ) : null}

          {/* Actions based on current state */}
          {currentMomoState === 'pending' ? (
            <View>
              <Button
                label="Check Payment Status Now"
                variant="primary"
                size="lg"
                onPress={() => checkMomoPaymentStatus(true)}
                loading={isCheckingStatus}
                leftIcon={<ArrowPathIcon color={colors.onPrimary} size={18} />}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change Phone Number"
                onPress={handleResetMomoSession}
                className="mt-3 py-2.5 items-center justify-center"
              >
                <AppText variant="caption" className="text-text-secondary font-semibold">
                  Wrong phone number? Cancel & Edit Number
                </AppText>
              </Pressable>
            </View>
          ) : currentMomoState === 'paid' ? (
            <Button
              label={`View Receipt${paymentStatus?.saleNumber ? ` • ${paymentStatus.saleNumber}` : ''}`}
              variant="primary"
              size="lg"
              onPress={() =>
                finalizeOrderSuccess(
                  {
                    orderId: paymentStatus?.orderId || momoSession.orderId || resolvedOrderId || '',
                    method: 'mobile_money',
                    amount: paymentStatus?.amount || momoSession.amount || resolvedTotal,
                    saleId: paymentStatus?.saleId,
                    saleNumber: paymentStatus?.saleNumber,
                    paymentId: momoSession.paymentId,
                  },
                  'paid',
                )
              }
            />
          ) : (
            <View className="flex-row">
              <View className="flex-1 mr-2">
                <Button
                  label="Switch to Cash"
                  variant="secondary"
                  onPress={() => {
                    handleResetMomoSession();
                    setSelectedMethod('cash');
                  }}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Try Again"
                  variant="primary"
                  onPress={handleResetMomoSession}
                />
              </View>
            </View>
          )}
        </View>
      ) : (
        /* MOMO INITIATION FORM VIEW */
        <View className="rounded-3xl bg-surface border border-border p-5 mb-5">
          {momoError ? (
            <AlertBanner severity="error" message={momoError} className="mb-4" />
          ) : null}

          <AppText variant="label" className="font-bold text-text mb-3">
            Choose Telecom Provider
          </AppText>

          {/* Telecom Network Selector */}
          <View className="flex-row justify-between mb-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="MTN Mobile Money"
              onPress={() => setSelectedNetwork('mtn')}
              style={{
                borderColor: selectedNetwork === 'mtn' ? '#eab308' : colors.outlineVariant,
                backgroundColor:
                  selectedNetwork === 'mtn' ? 'rgba(234, 179, 8, 0.15)' : colors.background,
              }}
              className="w-[48%] p-3.5 rounded-2xl border flex-row items-center"
            >
              <View className="h-9 w-9 rounded-xl bg-yellow-500 items-center justify-center mr-2.5">
                <AppText className="text-xs font-black text-black">MTN</AppText>
              </View>
              <View className="flex-1">
                <AppText variant="label" className="font-bold text-text text-sm">
                  MTN MoMo
                </AppText>
                <AppText variant="caption" className="text-[10px] text-text-secondary">
                  Direct STK Push
                </AppText>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Airtel Money"
              onPress={() => setSelectedNetwork('airtel')}
              style={{
                borderColor: selectedNetwork === 'airtel' ? '#ef4444' : colors.outlineVariant,
                backgroundColor:
                  selectedNetwork === 'airtel' ? 'rgba(239, 68, 68, 0.15)' : colors.background,
              }}
              className="w-[48%] p-3.5 rounded-2xl border flex-row items-center"
            >
              <View className="h-9 w-9 rounded-xl bg-red-600 items-center justify-center mr-2.5">
                <AppText className="text-xs font-black text-white">airtel</AppText>
              </View>
              <View className="flex-1">
                <AppText variant="label" className="font-bold text-text text-sm">
                  Airtel Money
                </AppText>
                <AppText variant="caption" className="text-[10px] text-text-secondary">
                  Direct Prompt
                </AppText>
              </View>
            </Pressable>
          </View>

          {/* Customer Phone */}
          <View className="mb-4">
            <AppText variant="caption" className="text-text-secondary font-semibold uppercase text-[11px] mb-1.5">
              Customer Mobile Phone (e.g. 0773047940)
            </AppText>
            <View className="flex-row items-center rounded-xl bg-background border border-border px-3.5 py-1.5">
              <View className="flex-row items-center mr-2 pr-2 border-r border-border">
                <AppText className="text-sm mr-1">🇺🇬</AppText>
                <AppText variant="label" className="font-bold text-text">
                  UG
                </AppText>
              </View>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholder="0773047940"
                placeholderTextColor={colors.onSurfaceVariant}
                style={{ color: colors.onSurface }}
                className="flex-1 text-base font-bold py-1.5"
              />
            </View>
          </View>

          <AlertBanner
            severity="info"
            message="An STK push prompt will be sent to the customer's phone for PIN authorization. Status updates automatically."
            className="mb-4"
          />

          {/* Initiate MoMo CTA */}
          <Button
            label={`Initiate ${selectedNetwork.toUpperCase()} Payment • UGX ${resolvedTotal.toLocaleString()}`}
            variant="primary"
            size="lg"
            onPress={handleInitiateMoMo}
            loading={isInitiatingMomo}
            disabled={isFetchingOrderId}
          />
        </View>
      )}
    </ScreenTemplate>
  );
};
