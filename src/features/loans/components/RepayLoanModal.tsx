import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  View,
} from 'react-native';
import {
  BanknotesIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { AlertBanner } from '../../../components/molecules/AlertBanner';
import { FormField } from '../../../components/molecules/FormField';
import { useTheme } from '../../../theme/ThemeProvider';
import {
  formatCurrencyInput,
  formatUGX,
  parseCurrencyInput,
} from '../../../utils/currency';
import { useAuthStore } from '../../auth/store/authStore';
import { useMemberMeQuery } from '../../memberAccount/hooks/useMemberAccountQueries';
import {
  useRepayLoanMutation,
  useRepayQuoteQuery,
  useSendRepayOtpMutation,
} from '../hooks/useLoans';
import { loanRepayRequestSchema } from '../schemas/loanSchemas';
import type { LoanItem } from '../types/loanTypes';

export type RepayLoanModalProps = {
  loan: LoanItem | null;
  visible: boolean;
  onClose: () => void;
};

export function RepayLoanModal({ loan, visible, onClose }: RepayLoanModalProps) {
  const { colors } = useTheme();
  const member = useAuthStore(state => state.member);

  const { data: memberMeData } = useMemberMeQuery();
  const savingsBalance = memberMeData?.balances?.savings ?? 0;

  const [rawAmount, setRawAmount] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize amount with balance due when modal opens
  const effectiveAmount =
    rawAmount !== '' ? parseCurrencyInput(rawAmount) : loan?.balance_due ?? 0;

  const { data: quote, isFetching: isFetchingQuote } = useRepayQuoteQuery(
    effectiveAmount,
    effectiveAmount > 0 && visible,
  );

  const sendOtpMutation = useSendRepayOtpMutation();
  const repayMutation = useRepayLoanMutation(loan?.id || '');

  const handleSendOtp = async () => {
    setErrorMessage(null);
    try {
      await sendOtpMutation.mutateAsync(effectiveAmount);
      setOtpSent(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to send SMS OTP. Please try again.');
      }
    }
  };

  const handleRepay = async () => {
    if (!loan) return;
    setErrorMessage(null);

    if (effectiveAmount > savingsBalance) {
      setErrorMessage(
        `Insufficient savings balance. Available: ${formatUGX(
          savingsBalance,
        )}, Required: ${formatUGX(effectiveAmount)}`,
      );
      return;
    }

    const validation = loanRepayRequestSchema.safeParse({
      amount: effectiveAmount,
      password: pin,
      otp: quote?.sms_code_needed ? otp : undefined,
    });

    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message || 'Please check your inputs');
      return;
    }

    try {
      const res = await repayMutation.mutateAsync(validation.data);
      setSuccessReceipt(
        res.message ||
          `Successfully paid ${formatUGX(res.paid)} towards loan ${loan.reference}.`,
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Repayment failed. Please check your PIN.');
      }
    }
  };

  const handleResetAndClose = () => {
    setRawAmount('');
    setPin('');
    setOtp('');
    setOtpSent(false);
    setSuccessReceipt(null);
    setErrorMessage(null);
    onClose();
  };

  if (!loan) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleResetAndClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="rounded-t-3xl border-t border-border bg-surface p-6 shadow-2xl">
          <View className="mb-4 flex-row items-center justify-between border-b border-border pb-3">
            <View>
              <AppText variant="title" className="font-bold text-text-primary">
                Repay Loan
              </AppText>
              <AppText className="text-xs text-text-secondary">
                {loan.reference} ({loan.type})
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              onPress={handleResetAndClose}
              hitSlop={8}
            >
              <XMarkIcon color={colors.textSecondary} size={22} />
            </Pressable>
          </View>

          {errorMessage ? <AlertBanner message={errorMessage} /> : null}

          {successReceipt ? (
            <View className="items-center py-6">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                <CheckCircleIcon color={colors.primary} size={40} />
              </View>
              <AppText variant="title" className="font-bold text-primary text-center">
                Repayment Successful!
              </AppText>
              <AppText className="mt-2 text-center text-sm text-text-secondary">
                {successReceipt}
              </AppText>
              <Button
                label="Done"
                onPress={handleResetAndClose}
                className="mt-6 w-full"
              />
            </View>
          ) : (
            <>
              {/* Balances summary */}
              <View className="mb-4 rounded-2xl bg-background p-4 border border-border">
                <View className="flex-row items-center justify-between mb-2">
                  <AppText variant="label" className="text-xs text-text-secondary">
                    Total Balance Due
                  </AppText>
                  <AppText className="font-bold text-text-primary">
                    {formatUGX(loan.balance_due)}
                  </AppText>
                </View>
                <View className="flex-row items-center justify-between">
                  <AppText variant="label" className="text-xs text-text-secondary">
                    Available Savings Balance
                  </AppText>
                  <AppText className="font-bold text-primary">
                    {formatUGX(savingsBalance)}
                  </AppText>
                </View>
              </View>

              {/* Repay amount input */}
              <FormField
                label="Repayment Amount (UGX)"
                placeholder={`Max: ${formatUGX(loan.balance_due)}`}
                value={
                  rawAmount !== ''
                    ? formatCurrencyInput(rawAmount)
                    : formatUGX(loan.balance_due, { showCurrency: false })
                }
                onChangeText={text => {
                  setRawAmount(text.replace(/\D/g, ''));
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="numeric"
                helperText="Deducted directly from your available savings"
              />

              {/* Quick Preset Buttons */}
              <View className="mb-4 flex-row gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Repay full balance"
                  onPress={() => setRawAmount(loan.balance_due.toString())}
                  className="rounded-xl border border-primary bg-primary/10 px-3 py-1.5"
                >
                  <AppText variant="label" className="text-xs font-semibold text-primary">
                    Full Balance
                  </AppText>
                </Pressable>
                {loan.balance_due > 20000 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Repay half balance"
                    onPress={() =>
                      setRawAmount(Math.round(loan.balance_due / 2).toString())
                    }
                    className="rounded-xl border border-border bg-background px-3 py-1.5"
                  >
                    <AppText variant="label" className="text-xs font-semibold text-text-secondary">
                      Half Balance ({formatUGX(Math.round(loan.balance_due / 2))})
                    </AppText>
                  </Pressable>
                ) : null}
              </View>

              {/* Fee Quote Breakdown */}
              {effectiveAmount > 0 ? (
                <View className="mb-4 rounded-xl border border-primary/20 bg-background p-3.5">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <AppText variant="label" className="text-xs text-text-secondary">
                      Loan Principal Repayment
                    </AppText>
                    <AppText className="font-semibold text-text-primary text-xs">
                      {formatUGX(effectiveAmount)}
                    </AppText>
                  </View>
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center gap-1">
                      <AppText variant="label" className="text-xs text-text-secondary">
                        Transfer Fee
                      </AppText>
                      {isFetchingQuote ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : null}
                    </View>
                    <AppText className="font-semibold text-text-primary text-xs">
                      {formatUGX(quote?.fee ?? 0)}
                    </AppText>
                  </View>
                  <View className="mt-1 flex-row items-center justify-between border-t border-border pt-1.5">
                    <AppText variant="label" className="font-bold text-text-primary text-xs">
                      Total Taken from Savings
                    </AppText>
                    <AppText className="font-extrabold text-primary text-sm">
                      {formatUGX(quote?.total_taken_from_savings ?? effectiveAmount)}
                    </AppText>
                  </View>
                </View>
              ) : null}

              {/* SMS OTP verification if required by server */}
              {quote?.sms_code_needed ? (
                <View className="mb-4 rounded-xl border border-border bg-background p-3">
                  <AppText variant="label" className="font-bold text-text-primary mb-2 text-xs">
                    SMS Verification Required
                  </AppText>
                  {!otpSent ? (
                    <Button
                      label="Send SMS Code"
                      variant="outline"
                      onPress={handleSendOtp}
                      loading={sendOtpMutation.isPending}
                    />
                  ) : (
                    <FormField
                      label="6-Digit Code"
                      placeholder="123456"
                      value={otp}
                      onChangeText={text => setOtp(text.replace(/\D/g, '').slice(0, 6))}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  )}
                </View>
              ) : null}

              {/* Security PIN Re-entry */}
              <FormField
                label="Enter 4 or 5 Digit Security PIN"
                placeholder="••••"
                value={pin}
                onChangeText={text => {
                  setPin(text.replace(/\D/g, '').slice(0, 5));
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="numeric"
                isPassword
                maxLength={5}
                helperText="Required on every money transaction"
              />

              <Button
                label={`Authorize Repayment of ${formatUGX(effectiveAmount)}`}
                onPress={handleRepay}
                loading={repayMutation.isPending}
                disabled={repayMutation.isPending || pin.length < 4 || effectiveAmount <= 0}
                className="mt-2"
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

