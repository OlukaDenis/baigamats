import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  View,
} from 'react-native';
import {
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from 'react-native-heroicons/outline';
import { AppText } from '@horeca/components/atoms/AppText';
import { Button } from '@horeca/components/atoms/Button';
import { useHorecaColors } from '@horeca/theme/colors';
import type { TelecomProvider } from './MobileMoneyInput';
import { AirtelSvgLogo, MtnSvgLogo } from './TelecomLogos';

export interface MobileMoneyProcessingViewProps {
  phoneNumber: string;
  provider: TelecomProvider;
  orderId: string;
  paymentId?: string | null;
  amount: number;
  feeAmount?: number | null;
  chargeAmount?: number | null;
  state: 'submitting' | 'pending' | 'paid' | 'failed' | 'cancelled' | null;
  saleNumber?: string | null;
  errorMessage?: string | null;
  elapsedSeconds: number;
  isCheckingStatus: boolean;
  onCheckStatus: () => void;
  onCancelOrEdit: () => void;
  onSwitchToCash?: () => void;
  onRetry?: () => void;
  onViewReceipt?: () => void;
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Elegant, real-time Mobile Money waiting & settlement component.
 * Features animated STK pulse radar, live countdown, carrier-specific branding,
 * fee transparency, and immediate status checks.
 */
export const MobileMoneyProcessingView: React.FC<MobileMoneyProcessingViewProps> = ({
  phoneNumber,
  provider,
  orderId,
  paymentId,
  amount,
  feeAmount,
  chargeAmount,
  state,
  saleNumber,
  errorMessage,
  elapsedSeconds,
  isCheckingStatus,
  onCheckStatus,
  onCancelOrEdit,
  onSwitchToCash,
  onRetry,
  onViewReceipt,
}) => {
  const colors = useHorecaColors();

  // Multi-ring radar pulse animations for 'pending' or 'submitting' state
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  const isSubmitting = state === 'submitting';
  const isPending = state === 'pending';
  const isWaiting = isSubmitting || isPending;
  const isPaid = state === 'paid';
  const isFailed = state === 'failed' || state === 'cancelled';
  const isMtn = provider === 'mtn';

  useEffect(() => {
    if (isWaiting) {
      const pulseLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim1, {
              toValue: 1.35,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim1, {
              toValue: 1,
              duration: 1200,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseAnim2, {
              toValue: 1.55,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim2, {
              toValue: 0.85,
              duration: 1200,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.15,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    } else {
      pulseAnim1.setValue(1);
      pulseAnim2.setValue(1);
      opacityAnim.setValue(0);
    }
  }, [isWaiting, pulseAnim1, pulseAnim2, opacityAnim]);

  const totalCharge = chargeAmount ?? (amount + (feeAmount ?? 0));

  return (
    <View className="rounded-horeca bg-surface border border-border p-5 mb-5 shadow-sm">
      {/* ============================================================== */}
      {/* 1. Header with Animated Radar Pulse / Status Artwork           */}
      {/* ============================================================== */}
      <View className="items-center pt-2 pb-5 border-b border-border/50">
        <View className="h-28 w-28 items-center justify-center my-1">
          {isWaiting ? (
            <>
              {/* Outer Radar Pulse Ring */}
              <Animated.View
                style={{
                  transform: [{ scale: pulseAnim2 }],
                  opacity: opacityAnim,
                  backgroundColor: isMtn ? '#ffc40330' : '#e6000025',
                }}
                className="absolute h-28 w-28 rounded-full"
              />
              {/* Middle Pulse Ring */}
              <Animated.View
                style={{
                  transform: [{ scale: pulseAnim1 }],
                  backgroundColor: isMtn ? '#ffc40345' : '#e6000035',
                }}
                className="absolute h-20 w-20 rounded-full"
              />
              {/* Central Carrier Badge */}
              <View
                className={`h-16 w-16 rounded-horeca items-center justify-center shadow-md border-2 ${isMtn
                  ? 'bg-[#FFCC00] border-yellow-500'
                  : 'bg-[#FFF0F0] dark:bg-[#330808] border-[#E60000]'
                  }`}
              >
                {isMtn ? (
                  <MtnSvgLogo size={42} />
                ) : (
                  <AirtelSvgLogo size={42} />
                )}
              </View>
            </>
          ) : isPaid ? (
            <View className="h-20 w-20 rounded-full bg-status-available/15 border-2 border-status-available items-center justify-center shadow-sm">
              <CheckCircleIcon color={colors.statusAvailable} size={48} />
            </View>
          ) : (
            <View className="h-20 w-20 rounded-full bg-error/15 border-2 border-error items-center justify-center shadow-sm">
              <XCircleIcon color={colors.error} size={48} />
            </View>
          )}
        </View>

        {/* Dynamic Status Pill */}
        <View className="mt-2 mb-2">
          {isSubmitting ? (
            <View
              className={`flex-row items-center px-3.5 py-1.5 rounded-horeca border ${isMtn
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : 'bg-red-500/10 border-red-500/30'
                }`}
            >
              <ActivityIndicator size="small" color={isMtn ? '#ca8a04' : '#dc2626'} style={{ transform: [{ scale: 0.7 }], marginRight: 4 }} />
              <AppText
                variant="caption"
                className={`font-black text-xs ${isMtn
                  ? 'text-yellow-700 dark:text-yellow-400'
                  : 'text-red-700 dark:text-red-400'
                  }`}
              >
                CONNECTING TO GATEWAY...
              </AppText>
            </View>
          ) : isPending ? (
            <View
              className={`flex-row items-center px-3.5 py-1.5 rounded-horeca border ${isMtn
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : 'bg-red-500/10 border-red-500/30'
                }`}
            >
              <ClockIcon color={isMtn ? '#ca8a04' : '#dc2626'} size={14} />
              <AppText
                variant="caption"
                className={`font-black ml-1.5 text-xs ${isMtn
                  ? 'text-yellow-700 dark:text-yellow-400'
                  : 'text-red-700 dark:text-red-400'
                  }`}
              >
                AWAITING CUSTOMER PIN • {formatElapsed(elapsedSeconds)}
              </AppText>
            </View>
          ) : isPaid ? (
            <View className="flex-row items-center px-3.5 py-1.5 rounded-horeca bg-status-available/15 border border-status-available/30">
              <ShieldCheckIcon color={colors.statusAvailable} size={15} />
              <AppText variant="caption" className="text-status-available font-black ml-1.5 text-xs">
                PAYMENT CONFIRMED & VERIFIED
              </AppText>
            </View>
          ) : (
            <View className="flex-row items-center px-3.5 py-1.5 rounded-horeca bg-error/15 border border-error/30">
              <ExclamationTriangleIcon color={colors.error} size={15} />
              <AppText variant="caption" className="text-error font-black ml-1.5 text-xs">
                PAYMENT {state ? state.toUpperCase() : 'FAILED'}
              </AppText>
            </View>
          )}
        </View>

        {/* Status Title */}
        <AppText variant="title" className="text-xl font-extrabold text-text text-center mt-1">
          {isSubmitting
            ? 'Dispatching Payment Prompt...'
            : isPending
              ? isMtn
                ? 'MTN MoMo Prompt Pushed'
                : 'Airtel Money Prompt Pushed'
              : isPaid
                ? 'Mobile Money Received!'
                : 'Payment Could Not Be Completed'}
        </AppText>

        {/* Subtitle / Customer Instruction */}
        <AppText variant="caption" className="text-text-secondary text-center mt-1.5 max-w-xs leading-5">
          {isSubmitting
            ? `Sending STK Push prompt to ${phoneNumber}...`
            : isPending
              ? `Please ask the customer to check handset ${phoneNumber} and enter their PIN to authorize payment.`
              : isPaid
                ? saleNumber
                  ? `Sale ${saleNumber} confirmed. Order settled successfully.`
                  : 'Payment received. Settlement finalized.'
                : errorMessage ||
                'The STK authorization prompt was declined, timed out, or had insufficient funds.'}
        </AppText>
      </View>

      {/* ============================================================== */}
      {/* 2. Customer & Fee Transparency Card                            */}
      {/* ============================================================== */}
      <View className="my-4 p-4 rounded-horeca bg-background border border-border">
        {/* Customer Phone & Carrier */}
        <View className="flex-row items-center justify-between mb-2.5">
          <AppText variant="caption" className="text-text-secondary font-medium">
            Customer Handset
          </AppText>
          <View className="flex-row items-center">
            {isMtn ? (
              <MtnSvgLogo size={12} />
            ) : provider === 'airtel' ? (
              <AirtelSvgLogo size={12} />
            ) : null}
            <PhoneIcon color={colors.primary} size={14} />
            <AppText variant="label" className="font-bold text-text ml-1 text-sm">
              {phoneNumber}
            </AppText>
          </View>
        </View>

        {/* Bill Amount */}
        <View className="flex-row items-center justify-between mb-2">
          <AppText variant="caption" className="text-text-secondary font-medium">
            Order Total
          </AppText>
          <AppText variant="label" className="font-semibold text-text">
            UGX {amount.toLocaleString()}
          </AppText>
        </View>
      </View>

      {/* ============================================================== */}
      {/* 3. Real-time Status Stepper                                    */}
      {/* ============================================================== */}
      <View className="mb-5 px-1">
        {/* Step 1: Prompt Dispatched */}
        <View className="flex-row items-center mb-3">
          <View
            className={`h-6 w-6 rounded-full items-center justify-center mr-3 ${isSubmitting ? 'bg-primary/20 border border-primary' : 'bg-status-available'
              }`}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ transform: [{ scale: 0.6 }] }} />
            ) : (
              <CheckCircleIcon color="#ffffff" size={15} />
            )}
          </View>
          <View className="flex-1">
            <AppText variant="label" className="text-text font-bold text-xs">
              1. Prompt Dispatched
            </AppText>
            <AppText variant="caption" className="text-text-secondary text-[11px]">
              {paymentId ? `ID: ${paymentId.slice(0, 14)}...` : 'Connecting to telco...'}
            </AppText>
          </View>
        </View>

        {/* Step 2: Customer PIN Authorization */}
        <View className="flex-row items-center mb-3">
          {isPending ? (
            <View className="h-6 w-6 rounded-full bg-primary/15 border border-primary items-center justify-center mr-3">
              <ActivityIndicator size="small" color={colors.primary} style={{ transform: [{ scale: 0.65 }] }} />
            </View>
          ) : isPaid ? (
            <View className="h-6 w-6 rounded-full bg-status-available items-center justify-center mr-3">
              <CheckCircleIcon color="#ffffff" size={15} />
            </View>
          ) : isFailed ? (
            <View className="h-6 w-6 rounded-full bg-error items-center justify-center mr-3">
              <XCircleIcon color="#ffffff" size={15} />
            </View>
          ) : (
            <View className="h-6 w-6 rounded-full bg-background border border-border items-center justify-center mr-3">
              <AppText variant="caption" className="text-text-secondary font-bold text-[10px]">
                2
              </AppText>
            </View>
          )}
          <View className="flex-1">
            <AppText variant="label" className="text-text font-bold text-xs">
              2. Customer PIN Authorization
            </AppText>
            <AppText variant="caption" className="text-text-secondary text-[11px]">
              {isSubmitting
                ? 'Awaiting telco dispatch confirmation'
                : isPending
                  ? 'Listening for gateway confirmation (checks every 3s)...'
                  : isPaid
                    ? 'PIN verified & funds transferred'
                    : errorMessage || 'Authorization declined or timed out'}
            </AppText>
          </View>
        </View>

        {/* Step 3: Sale Settled */}
        <View className="flex-row items-center">
          {isPaid ? (
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
              className={`font-bold text-xs ${isPaid ? 'text-text' : 'text-text-secondary'}`}
            >
              3. Order Settled & Receipt Issued
            </AppText>
            <AppText variant="caption" className="text-text-secondary text-[11px]">
              {saleNumber ? `Sale No: ${saleNumber}` : 'Finalizes automatically upon payment'}
            </AppText>
          </View>
        </View>
      </View>

      {/* ============================================================== */}
      {/* 4. Action Controls                                            */}
      {/* ============================================================== */}
      {isSubmitting ? (
        <View>
          <Button
            label="Sending Prompt to Handset..."
            variant="primary"
            size="lg"
            disabled
            loading
          />
        </View>
      ) : isPending ? (
        <View>
          <Button
            label="Check Status Now"
            variant="primary"
            size="lg"
            onPress={onCheckStatus}
            loading={isCheckingStatus}
            leftIcon={<ArrowPathIcon color={colors.onPrimary} size={18} />}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel or change number"
            onPress={onCancelOrEdit}
            className="mt-3 py-2 items-center justify-center"
          >
            <AppText variant="caption" className="text-text-secondary font-semibold">
              Wrong phone number? Cancel & Edit Number
            </AppText>
          </Pressable>
        </View>
      ) : isPaid ? (
        <View>
          <Button
            label={saleNumber ? `Completed • Sale #${saleNumber}` : 'Payment Completed'}
            variant="primary"
            size="lg"
            onPress={onViewReceipt || onCheckStatus}
            leftIcon={<ReceiptPercentIcon color={colors.onPrimary} size={18} />}
          />
        </View>
      ) : (
        <View className="flex-row">
          {onSwitchToCash ? (
            <View className="flex-1 mr-2">
              <Button
                label="Pay with Cash"
                variant="secondary"
                size="md"
                onPress={onSwitchToCash}
                leftIcon={<BanknotesIcon color={colors.primary} size={16} />}
              />
            </View>
          ) : null}
          <View className="flex-1">
            <Button
              label="Retry STK Push"
              variant="primary"
              size="md"
              onPress={onRetry || onCancelOrEdit}
              leftIcon={<ArrowPathIcon color={colors.onPrimary} size={16} />}
            />
          </View>
        </View>
      )}
    </View>
  );
};
