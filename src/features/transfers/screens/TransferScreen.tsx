import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  ArrowPathIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ClockIcon,
  HeartIcon,
  InformationCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
  UserIcon,
  XCircleIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';

import type { MainTabParamList } from '../../../app/navigation/types';
import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { AlertBanner } from '../../../components/molecules/AlertBanner';
import { FormField } from '../../../components/molecules/FormField';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';
import {
  formatCurrencyInput,
  formatUGX,
  parseCurrencyInput,
} from '../../../utils/currency';
import { useAuthStore } from '../../auth/store/authStore';
import { useMemberMeQuery } from '../../memberAccount/hooks/useMemberAccountQueries';
import { BeneficiarySelector } from '../components/BeneficiarySelector';
import {
  useRequestStatusPolling,
  useSendTransferOtpMutation,
  useSubmitTransferMutation,
  useTransferQuoteQuery,
} from '../hooks/useTransfers';
import {
  transferRequestSubmissionSchema,
  type TransferKind,
} from '../schemas/transferSchemas';

export function TransferScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();

  const initialKind: TransferKind = route.params?.kind || 'withdraw';
  const [kind, setKind] = useState<TransferKind>(initialKind);

  const { data: memberMeData } = useMemberMeQuery();
  const savingsBalance = memberMeData?.balances?.savings ?? 0;
  const sharePrice = memberMeData?.balances?.share_price ?? 10_000;

  // Form states
  const [rawAmount, setRawAmount] = useState('50000');
  const [sharesCount, setSharesCount] = useState('10');
  const [beneficiaryId, setBeneficiaryId] = useState<string | null>(null);
  const [recipientMemberNo, setRecipientMemberNo] = useState('');
  const [note, setNote] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Security confirmation state
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const numericAmount = parseCurrencyInput(rawAmount);
  const numericShares = parseInt(sharesCount.replace(/\D/g, ''), 10) || 0;

  // Real-time Quote Query
  const isSharesKind = kind === 'to_shares';
  const quoteQuery = useTransferQuoteQuery({
    kind,
    amount: isSharesKind ? undefined : numericAmount,
    shares: isSharesKind ? numericShares : undefined,
    enabled: isSharesKind ? numericShares > 0 : numericAmount > 0,
  });

  const quote = quoteQuery.data;
  const sendOtpMutation = useSendTransferOtpMutation();
  const submitMutation = useSubmitTransferMutation();

  const { requestStatus, isSettled } = useRequestStatusPolling(activeRequestId);

  const handleSendOtp = async () => {
    setErrorMessage(null);
    try {
      await sendOtpMutation.mutateAsync({
        kind,
        amount: isSharesKind ? undefined : numericAmount,
      });
      setOtpSent(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to send SMS OTP. Please try again.');
      }
    }
  };

  const handleOpenPinConfirmation = () => {
    setErrorMessage(null);

    // Basic client validations
    if (kind === 'withdraw' && !beneficiaryId) {
      setErrorMessage('Please select a saved withdrawal number');
      return;
    }

    if (kind === 'to_member' && !recipientMemberNo.trim()) {
      setErrorMessage('Please enter the recipient member number');
      return;
    }

    if (quote && quote.total_taken_from_savings > savingsBalance) {
      setErrorMessage(
        `Insufficient savings. Total required: ${formatUGX(
          quote.total_taken_from_savings,
        )}, Available: ${formatUGX(savingsBalance)}`,
      );
      return;
    }

    if (quote?.sms_code_needed && otp.length !== 6) {
      setErrorMessage('Please enter the 6-digit SMS verification code');
      return;
    }

    setPin('');
    setPinModalVisible(true);
  };

  const handleConfirmSubmit = async () => {
    setErrorMessage(null);

    const payload = {
      kind,
      password: pin,
      amount: isSharesKind ? undefined : numericAmount,
      shares: isSharesKind ? numericShares : undefined,
      member_no: kind === 'to_member' ? recipientMemberNo.trim() : undefined,
      beneficiary_id: kind === 'withdraw' ? beneficiaryId || undefined : undefined,
      note: note.trim() || undefined,
      otp: quote?.sms_code_needed ? otp : undefined,
    };

    const validation = transferRequestSubmissionSchema.safeParse(payload);
    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message || 'Invalid parameters');
      return;
    }

    try {
      setPinModalVisible(false);
      const res = await submitMutation.mutateAsync(validation.data);
      setActiveRequestId(res.id);
      setResultModalVisible(true);
    } catch (err: unknown) {
      setPinModalVisible(false);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Transfer request failed. Please check your PIN and balance.');
      }
    }
  };

  const handleCloseResultModal = () => {
    setResultModalVisible(false);
    setActiveRequestId(null);
    if (requestStatus === 'approved' || requestStatus === 'completed') {
      navigation.goBack();
    }
  };

  return (
    <ScreenTemplate>
      {/* Header */}
      <View className="mb-6 items-center">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-sm">
          <ArrowUpRightIcon color={colors.onPrimary} size={32} />
        </View>
        <AppText
          variant="display"
          accessibilityRole="header"
          className="text-center font-bold text-text-primary"
        >
          Withdraw & Transfer
        </AppText>
        <AppText className="mt-1 text-center text-sm text-text-secondary">
          Available Savings: {formatUGX(savingsBalance)}
        </AppText>
      </View>

      {errorMessage ? <AlertBanner message={errorMessage} /> : null}

      {/* 4-way Kind Segmented Selector */}
      <View className="mb-6 flex-row rounded-2xl bg-border/40 p-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Withdraw to mobile money"
          onPress={() => setKind('withdraw')}
          className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
            kind === 'withdraw' ? 'bg-primary shadow-sm' : ''
          }`}
        >
          <AppText
            variant="label"
            className={`text-xs font-bold ${
              kind === 'withdraw' ? 'text-on-primary' : 'text-text-secondary'
            }`}
          >
            Withdraw
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Transfer to another member"
          onPress={() => setKind('to_member')}
          className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
            kind === 'to_member' ? 'bg-primary shadow-sm' : ''
          }`}
        >
          <AppText
            variant="label"
            className={`text-xs font-bold ${
              kind === 'to_member' ? 'text-on-primary' : 'text-text-secondary'
            }`}
          >
            To Member
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buy shares"
          onPress={() => setKind('to_shares')}
          className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
            kind === 'to_shares' ? 'bg-primary shadow-sm' : ''
          }`}
        >
          <AppText
            variant="label"
            className={`text-xs font-bold ${
              kind === 'to_shares' ? 'text-on-primary' : 'text-text-secondary'
            }`}
          >
            Buy Shares
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pay welfare contribution"
          onPress={() => setKind('to_welfare')}
          className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
            kind === 'to_welfare' ? 'bg-primary shadow-sm' : ''
          }`}
        >
          <AppText
            variant="label"
            className={`text-xs font-bold ${
              kind === 'to_welfare' ? 'text-on-primary' : 'text-text-secondary'
            }`}
          >
            Welfare
          </AppText>
        </Pressable>
      </View>

      {/* Main Form Body */}
      <View className="rounded-3xl border border-border bg-surface p-6 shadow-sm mb-6">
        {/* Kind: Withdraw */}
        {kind === 'withdraw' ? (
          <BeneficiarySelector
            selectedId={beneficiaryId}
            onSelect={setBeneficiaryId}
          />
        ) : null}

        {/* Kind: To Member */}
        {kind === 'to_member' ? (
          <FormField
            label="Recipient Member Number"
            placeholder="e.g. M-1049"
            value={recipientMemberNo}
            onChangeText={setRecipientMemberNo}
            autoCapitalize="characters"
            leftIcon={<UserIcon color={colors.textSecondary} size={20} />}
            helperText="The cooperative member number of the recipient"
          />
        ) : null}

        {/* Kind: Buy Shares */}
        {kind === 'to_shares' ? (
          <>
            <FormField
              label="Number of Shares to Purchase"
              placeholder="e.g. 10"
              value={sharesCount}
              onChangeText={text => setSharesCount(text.replace(/\D/g, ''))}
              keyboardType="numeric"
              leftIcon={<CircleStackIcon color={colors.textSecondary} size={20} />}
              helperText={`Share unit price: ${formatUGX(sharePrice)}`}
            />
            <View className="mb-4 rounded-xl bg-background p-3 border border-border">
              <AppText className="text-xs text-text-secondary">
                Purchasing {numericShares} shares @ {formatUGX(sharePrice)} ={' '}
                <AppText className="font-bold text-text-primary">
                  {formatUGX(numericShares * sharePrice)}
                </AppText>
              </AppText>
            </View>
          </>
        ) : (
          /* General Amount Input for withdraw, to_member, to_welfare */
          <FormField
            label="Amount (UGX)"
            placeholder="e.g. 50,000"
            value={formatCurrencyInput(rawAmount)}
            onChangeText={text => setRawAmount(text.replace(/\D/g, ''))}
            keyboardType="numeric"
            helperText="Amount to be deducted from available savings"
          />
        )}

        {/* Optional Note */}
        <FormField
          label="Transaction Note (Optional)"
          placeholder="e.g. School fees, welfare payment"
          value={note}
          onChangeText={setNote}
          maxLength={100}
        />

        {/* Real-Time Fee Quotation Card */}
        {quote ? (
          <View className="my-3 rounded-2xl border border-primary/20 bg-background p-4">
            <View className="flex-row items-center justify-between mb-2">
              <AppText variant="label" className="text-xs text-text-secondary">
                Transfer Principal
              </AppText>
              <AppText className="font-semibold text-text-primary">
                {formatUGX(quote.amount)}
              </AppText>
            </View>

            <View className="flex-row items-center justify-between mb-2">
              <AppText variant="label" className="text-xs text-text-secondary">
                Cooperative Transfer Fee
              </AppText>
              <AppText className="font-semibold text-text-primary">
                {formatUGX(quote.fee)}
              </AppText>
            </View>

            <View className="mt-2 flex-row items-center justify-between border-t border-border pt-2">
              <AppText variant="label" className="font-bold text-text-primary">
                Total Taken from Savings
              </AppText>
              <AppText className="text-lg font-extrabold text-primary">
                {formatUGX(quote.total_taken_from_savings)}
              </AppText>
            </View>

            {quote.sms_code_needed ? (
              <View className="mt-3 rounded-xl bg-secondary/15 p-2.5">
                <AppText className="text-xs text-secondary font-semibold">
                  * Security Policy: This transaction requires SMS OTP verification.
                </AppText>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* SMS OTP verification section if required */}
        {quote?.sms_code_needed ? (
          <View className="my-3 rounded-2xl border border-border bg-background p-4">
            <AppText variant="label" className="font-bold text-text-primary mb-2">
              SMS Authorization Code
            </AppText>

            {!otpSent ? (
              <Button
                label="Send SMS Verification Code"
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
                helperText="Sent to your registered phone number"
              />
            )}
          </View>
        ) : null}

        {/* Continue Button */}
        <Button
          label="Review & Confirm"
          onPress={handleOpenPinConfirmation}
          className="mt-4"
        />
      </View>

      {/* Mandatory PIN Re-Verification Modal */}
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="rounded-t-3xl border-t border-border bg-surface p-6 shadow-2xl">
            <View className="mb-4 flex-row items-center justify-between border-b border-border pb-3">
              <View className="flex-row items-center gap-2">
                <KeyIcon color={colors.primary} size={22} />
                <AppText variant="title" className="font-bold text-text-primary">
                  Confirm with Security PIN
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close confirmation dialog"
                onPress={() => setPinModalVisible(false)}
                hitSlop={8}
              >
                <XMarkIcon color={colors.textSecondary} size={22} />
              </Pressable>
            </View>

            <AppText className="mb-4 text-sm text-text-secondary">
              Per security policy, enter your 4 or 5 digit PIN to authorize deducting{' '}
              <AppText className="font-bold text-text-primary">
                {formatUGX(quote?.total_taken_from_savings ?? numericAmount)}
              </AppText>{' '}
              from your savings.
            </AppText>

            <FormField
              label="Enter PIN"
              placeholder="••••"
              value={pin}
              onChangeText={text => setPin(text.replace(/\D/g, '').slice(0, 5))}
              keyboardType="numeric"
              isPassword
              maxLength={5}
            />

            <Button
              label="Authorize Transaction"
              onPress={handleConfirmSubmit}
              loading={submitMutation.isPending}
              disabled={submitMutation.isPending || pin.length < 4}
              className="mt-3"
            />
          </View>
        </View>
      </Modal>

      {/* Result & Settlement Modal */}
      <Modal
        visible={resultModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseResultModal}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-2xl items-center">
            {requestStatus === 'approved' || requestStatus === 'completed' ? (
              <>
                <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary/20">
                  <CheckCircleIcon color={colors.primary} size={48} />
                </View>
                <AppText variant="title" className="text-center font-bold text-primary">
                  Transaction Approved!
                </AppText>
                <AppText className="mt-2 text-center text-sm text-text-secondary">
                  Your request of{' '}
                  <AppText className="font-bold text-text-primary">
                    {formatUGX(quote?.amount ?? numericAmount)}
                  </AppText>{' '}
                  has been executed successfully.
                </AppText>
                <Button
                  label="Done"
                  onPress={handleCloseResultModal}
                  className="mt-6 w-full"
                />
              </>
            ) : requestStatus === 'waiting_for_approval' ? (
              <>
                <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-secondary/20">
                  <ClockIcon color={colors.secondary} size={48} />
                </View>
                <AppText variant="title" className="text-center font-bold text-text-primary">
                  Queued for Staff Approval
                </AppText>
                <AppText className="mt-2 text-center text-sm text-text-secondary">
                  This transaction exceeds the instant threshold and has been submitted
                  to your cooperative staff for manual review.
                </AppText>
                <View className="my-4 rounded-xl border border-border bg-background p-3 w-full flex-row items-center justify-center gap-2">
                  <ActivityIndicator size="small" color={colors.primary} />
                  <AppText className="text-xs text-text-secondary font-medium">
                    Monitoring approval status...
                  </AppText>
                </View>
                <Button
                  label="View in Statement"
                  variant="outline"
                  onPress={handleCloseResultModal}
                  className="mt-3 w-full"
                />
              </>
            ) : (
              <>
                <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-secondary/20">
                  <XCircleIcon color={colors.secondary} size={48} />
                </View>
                <AppText variant="title" className="text-center font-bold text-text-primary">
                  Transaction Refused
                </AppText>
                <AppText className="mt-2 text-center text-sm text-text-secondary">
                  Your request could not be processed by the cooperative server.
                </AppText>
                <Button
                  label="Close"
                  variant="outline"
                  onPress={handleCloseResultModal}
                  className="mt-6 w-full"
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenTemplate>
  );
}

