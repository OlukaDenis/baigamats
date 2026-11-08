import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  HORECA_OPEN_ORDERS_QUERY_KEY,
  refreshOpenOrdersInBackground,
} from '@horeca/features/orders/hooks/useOpenOrders';
import { printerService } from '@horeca/services/printerService';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { AlertBanner } from '@horeca/components/molecules/AlertBanner';
import { appModal } from '@horeca/components/molecules/modal/appModalStore';
import { HorecaSubAppBar } from '@horeca/components/organisms/HorecaSubAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import {
  detectTelecomProvider,
  MobileMoneyInput,
  type TelecomProvider,
} from '../components/MobileMoneyInput';
import { MobileMoneyProcessingView } from '../components/MobileMoneyProcessingView';

export { detectTelecomProvider, MobileMoneyInput, type TelecomProvider };

export interface CompletedPaymentResult {
  orderId: string;
  method: 'cash' | 'mobile_money';
  amount: number;
  saleId?: string | null;
  saleNumber?: string | null;
  paymentId?: string | null;
  fdn?: string | null;
}

interface PaymentCheckoutScreenProps {
  orderId?: string | null;
  totalAmount?: number;
  onPaymentSuccess: (result: CompletedPaymentResult) => void;
  onCancel: () => void;
  onLockTerminal: () => void;
}

/**
 * Normalizes a Ugandan phone input into standard 10-digit format.
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
    if (hasFinalizedRef.current) return;

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
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const detectedProvider = useMemo(() => detectTelecomProvider(phoneNumber), [phoneNumber]);
  const [isInitiatingMomo, setIsInitiatingMomo] = useState<boolean>(false);
  const [momoError, setMomoError] = useState<string | null>(null);
  const [momoSession, setMomoSession] = useState<StartPaymentResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const hasFinalizedRef = useRef<boolean>(false);

  const currentMomoState = isInitiatingMomo
    ? 'submitting'
    : (paymentStatus?.state ?? momoSession?.state ?? null);

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
      if (resolvedOrderId && resolvedOrderId !== result.orderId) {
        completeOrderSettlement(resolvedOrderId, status);
      }
      refreshOpenOrdersInBackground(queryClient).catch(() => { });
      queryClient.invalidateQueries({ queryKey: HORECA_OPEN_ORDERS_QUERY_KEY }).catch(() => { });
      queryClient.invalidateQueries({ queryKey: HORECA_TABLES_QUERY_KEY }).catch(() => { });
      onPaymentSuccess(result);
    },
    [completeOrderSettlement, onPaymentSuccess, queryClient, resolvedOrderId],
  );

  // ==========================================
  // Cash Payment: POST /orders/:orderId/bill
  // ==========================================
  const handleCashTender = async () => {
    setCashError(null);

    if (!resolvedOrderId || resolvedOrderId.startsWith('temp-ord-')) {
      appModal.error(
        'Order ID Required',
        'Unable to resolve the open order ID for this payment. Please return to the Order screen to sync.',
      );
      return;
    }

    if (cashTendered < resolvedTotal) {
      appModal.warning(
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

      if (triggerDrawer) {
        printerService.kickCashDrawer().catch(() => {
          // Do not block completing the cash sale if cash drawer / printer is offline
        });
      }

      finalizeOrderSuccess(
        {
          orderId: res.orderId || resolvedOrderId,
          method: 'cash',
          amount: resolvedTotal,
          saleId: res.saleId,
          saleNumber: res.saleNumber,
          fdn:
            res.fdn ||
            res.efrisInvoiceNumber ||
            res.efrisNumber ||
            res.fiscalNumber ||
            null,
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
      appModal.error(
        'Order ID Required',
        'Unable to resolve the open order ID for this payment. Please return to the Order screen to sync.',
      );
      return;
    }

    const normalizedPhone = normalizeUgandaPhone(phoneNumber);
    if (!/^0\d{9}$/.test(normalizedPhone)) {
      appModal.warning(
        'Invalid Phone Number',
        'Please enter a valid 10-digit mobile number.',
      );
      return;
    }

    const provider = detectTelecomProvider(normalizedPhone);
    if (provider === 'unknown') {
      appModal.warning(
        'Unsupported Telecom Provider',
        'The entered number does not match a supported MTN or Airtel prefix.\n\nMTN: 077, 078, 079, 076, 039\nAirtel: 070, 074, 073, 075, 072',
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
      setPaymentStatus({
        orderId: resolvedOrderId || '',
        paymentId: '',
        state: 'failed',
        message: apiMsg,
        amount: resolvedTotal,
      });
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
          const settledId = statusRes.orderId || targetOrderId;
          completeOrderSettlement(settledId, 'paid');
          refreshOpenOrdersInBackground(queryClient).catch(() => { });
          setTimeout(() => {
            finalizeOrderSuccess(
              {
                orderId: settledId,
                method: 'mobile_money',
                amount: statusRes.amount || momoSession.amount || resolvedTotal,
                saleId: statusRes.saleId,
                saleNumber: statusRes.saleNumber,
                paymentId: statusRes.paymentId,
                fdn:
                  statusRes.fdn ||
                  statusRes.efrisInvoiceNumber ||
                  statusRes.efrisNumber ||
                  statusRes.fiscalNumber ||
                  null,
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
    setIsInitiatingMomo(false);
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
      ) : isInitiatingMomo || momoSession || paymentStatus ? (
        /* SLEEK MOBILE MONEY WAITING & STATUS UI */
        <MobileMoneyProcessingView
          phoneNumber={phoneNumber}
          provider={detectedProvider}
          orderId={momoSession?.orderId || resolvedOrderId || ''}
          paymentId={momoSession?.paymentId || ''}
          amount={momoSession?.amount ?? resolvedTotal}
          feeAmount={momoSession?.feeAmount}
          chargeAmount={momoSession?.chargeAmount}
          state={currentMomoState}
          saleNumber={paymentStatus?.saleNumber}
          errorMessage={paymentStatus?.message || momoError}
          elapsedSeconds={elapsedSeconds}
          isCheckingStatus={isCheckingStatus}
          onCheckStatus={() => checkMomoPaymentStatus(true)}
          onCancelOrEdit={handleResetMomoSession}
          onSwitchToCash={() => {
            handleResetMomoSession();
            setSelectedMethod('cash');
          }}
          onRetry={() => {
            handleResetMomoSession();
            handleInitiateMoMo();
          }}
          onViewReceipt={() =>
            finalizeOrderSuccess(
              {
                orderId: paymentStatus?.orderId || momoSession?.orderId || resolvedOrderId || '',
                method: 'mobile_money',
                amount: paymentStatus?.amount || momoSession?.amount || resolvedTotal,
                saleId: paymentStatus?.saleId,
                saleNumber: paymentStatus?.saleNumber,
                paymentId: paymentStatus?.paymentId || momoSession?.paymentId,
                fdn:
                  paymentStatus?.fdn ||
                  paymentStatus?.efrisInvoiceNumber ||
                  paymentStatus?.efrisNumber ||
                  paymentStatus?.fiscalNumber ||
                  null,
              },
              'paid',
            )
          }
        />
      ) : (
        /* MOMO INITIATION FORM VIEW */
        <View className="rounded-3xl bg-surface border border-border p-5 mb-5">
          {momoError ? (
            <AlertBanner severity="error" message={momoError} className="mb-4" />
          ) : null}

          {/* Custom Mobile Money Input with Auto-Detected ISP & Dynamic Logo */}
          <MobileMoneyInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            label="Customer Mobile Phone"
            editable={!isInitiatingMomo}
            className="mb-4"
          />

          <AlertBanner
            severity="info"
            message={
              detectedProvider === 'mtn'
                ? "An MTN MoMo STK prompt will be pushed to the customer's handset. Ask them to confirm with their MoMo PIN."
                : detectedProvider === 'airtel'
                  ? "An Airtel Money prompt will be pushed to the customer's handset. Ask them to confirm with their PIN."
                  : "An STK push prompt will be sent to the customer's phone for PIN authorization. Status updates automatically."
            }
            className="mb-4"
          />

          {/* Initiate MoMo CTA */}
          <Button
            label={
              detectedProvider === 'mtn'
                ? `Initiate MTN MoMo • UGX ${resolvedTotal.toLocaleString()}`
                : detectedProvider === 'airtel'
                  ? `Initiate Airtel Money • UGX ${resolvedTotal.toLocaleString()}`
                  : `Initiate Mobile Money • UGX ${resolvedTotal.toLocaleString()}`
            }
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
