import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowDownLeftIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from 'react-native-heroicons/outline';

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
import {
  useDepositQuoteQuery,
  useDepositStatusPolling,
  useInitiateDepositMutation,
} from '../hooks/useDeposits';
import { initiateDepositRequestSchema } from '../schemas/depositSchemas';

const PRESET_AMOUNTS = [10_000, 20_000, 50_000, 100_000, 250_000, 500_000];

export function DepositScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const member = useAuthStore(state => state.member);

  const [rawAmount, setRawAmount] = useState('50000');
  const [phone, setPhone] = useState(member?.phone || '');
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const numericAmount = parseCurrencyInput(rawAmount);

  const { data: quote, isFetching: isFetchingQuote } = useDepositQuoteQuery(
    numericAmount,
    numericAmount > 0,
  );

  const initiateMutation = useInitiateDepositMutation();

  const { depositStatus, resultMessage, isSettled } = useDepositStatusPolling(
    activeDepositId,
  );

  useEffect(() => {
    if (activeDepositId) {
      setModalVisible(true);
    }
  }, [activeDepositId]);

  const handlePresetSelect = (preset: number) => {
    setRawAmount(preset.toString());
  };

  const handleInitiateDeposit = async () => {
    setSubmissionError(null);

    const validation = initiateDepositRequestSchema.safeParse({
      amount: numericAmount,
      phone,
    });

    if (!validation.success) {
      const issue = validation.error.issues[0]?.message || 'Please check your inputs';
      setSubmissionError(issue);
      return;
    }

    if (quote && numericAmount < quote.min_deposit) {
      setSubmissionError(`Minimum deposit is ${formatUGX(quote.min_deposit)}`);
      return;
    }

    if (quote && numericAmount > quote.max_deposit) {
      setSubmissionError(`Maximum deposit is ${formatUGX(quote.max_deposit)}`);
      return;
    }

    try {
      const result = await initiateMutation.mutateAsync(validation.data);
      setActiveDepositId(result.id);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSubmissionError(err.message);
      } else {
        setSubmissionError('Failed to initiate deposit. Please try again.');
      }
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    if (depositStatus === 'success') {
      navigation.goBack();
    } else {
      setActiveDepositId(null);
    }
  };

  return (
    <ScreenTemplate>
      {/* Header */}
      <View className="mb-6 items-center">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-secondary shadow-sm">
          <ArrowDownLeftIcon
            color={colors.onSecondary}
            size={32}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AppText
          variant="display"
          accessibilityRole="header"
          className="text-center font-bold text-text-primary"
        >
          Deposit to Savings
        </AppText>
        <AppText className="mt-1 text-center text-sm text-text-secondary">
          Transfer money instantly from MTN or Airtel Money.
        </AppText>
      </View>

      {submissionError ? <AlertBanner message={submissionError} /> : null}

      {/* Main Form */}
      <View className="rounded-3xl border border-border bg-surface p-6 shadow-sm mb-6">
        {/* Amount Input */}
        <FormField
          label="Deposit Amount (UGX)"
          placeholder="e.g. 50,000"
          value={formatCurrencyInput(rawAmount)}
          onChangeText={text => {
            const digits = text.replace(/\D/g, '');
            setRawAmount(digits);
            if (submissionError) setSubmissionError(null);
          }}
          keyboardType="numeric"
          helperText="Full amount will be credited to your savings balance"
        />

        {/* Preset Amount Chips */}
        <View className="mb-5 flex-row flex-wrap gap-2">
          {PRESET_AMOUNTS.map(preset => (
            <Pressable
              key={preset}
              accessibilityRole="button"
              accessibilityLabel={`Select ${formatUGX(preset)}`}
              onPress={() => handlePresetSelect(preset)}
              className={`rounded-xl border px-3 py-1.5 ${
                numericAmount === preset
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background'
              }`}
            >
              <AppText
                variant="label"
                className={`text-xs font-semibold ${
                  numericAmount === preset ? 'text-primary' : 'text-text-secondary'
                }`}
              >
                {formatUGX(preset)}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* Mobile Money Phone Input */}
        <FormField
          label="Mobile Money Phone Number"
          placeholder="e.g. 0772123456 or 0702123456"
          value={phone}
          onChangeText={text => {
            setPhone(text);
            if (submissionError) setSubmissionError(null);
          }}
          keyboardType="phone-pad"
          helperText="MTN MoMo or Airtel Money prompt will be sent here"
          leftIcon={<DevicePhoneMobileIcon color={colors.textSecondary} size={20} />}
        />

        {/* Real-time Dynamic Fee Quotation Breakdown */}
        {numericAmount > 0 ? (
          <View className="my-4 rounded-2xl border border-primary/20 bg-background p-4">
            <View className="flex-row items-center justify-between mb-2">
              <AppText variant="label" className="text-xs text-text-secondary">
                Credited to Savings
              </AppText>
              <AppText className="font-semibold text-text-primary">
                {formatUGX(numericAmount)}
              </AppText>
            </View>

            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1">
                <AppText variant="label" className="text-xs text-text-secondary">
                  Carrier / Transfer Fee
                </AppText>
                {isFetchingQuote ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : null}
              </View>
              <AppText className="font-semibold text-text-primary">
                {formatUGX(quote?.fee ?? 0)}
              </AppText>
            </View>

            <View className="mt-2 flex-row items-center justify-between border-t border-border pt-2">
              <AppText variant="label" className="font-bold text-text-primary">
                Total to Pay on Phone
              </AppText>
              <AppText className="text-lg font-extrabold text-primary">
                {formatUGX(quote?.total_to_pay ?? numericAmount)}
              </AppText>
            </View>

            <View className="mt-3 flex-row items-center gap-1.5">
              <InformationCircleIcon color={colors.textSecondary} size={16} />
              <AppText className="flex-1 text-xs text-text-secondary">
                Fee is paid on top; savings account receives exactly{' '}
                {formatUGX(numericAmount)}.
              </AppText>
            </View>
          </View>
        ) : null}

        {/* Submit Button */}
        <Button
          label={
            quote?.total_to_pay
              ? `Pay ${formatUGX(quote.total_to_pay)} via Mobile Money`
              : 'Send Payment Prompt'
          }
          onPress={handleInitiateDeposit}
          loading={initiateMutation.isPending}
          disabled={initiateMutation.isPending || numericAmount <= 0}
          className="mt-2"
        />
      </View>

      {/* Security notice */}
      <View className="flex-row items-center justify-center gap-2 mb-6">
        <ShieldCheckIcon color={colors.textSecondary} size={18} />
        <AppText className="text-xs text-text-secondary">
          Protected by Baigamats Idempotent Payment Guarantee
        </AppText>
      </View>

      {/* Polling & Settlement Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-2xl items-center">
            {depositStatus === 'pending' ? (
              <>
                <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-secondary/20">
                  <ActivityIndicator size="large" color={colors.secondary} />
                </View>
                <AppText variant="title" className="text-center font-bold text-text-primary">
                  Approve Prompt on Your Phone
                </AppText>
                <AppText className="mt-2 text-center text-sm text-text-secondary">
                  A mobile money payment request of{' '}
                  <AppText className="font-bold text-text-primary">
                    {formatUGX(quote?.total_to_pay ?? numericAmount)}
                  </AppText>{' '}
                  has been sent to your handset ({phone}).
                </AppText>
                <View className="my-5 rounded-xl border border-border bg-background p-3 w-full">
                  <AppText className="text-center text-xs text-text-secondary">
                    Please unlock your phone and enter your Mobile Money PIN. This
                    window updates automatically.
                  </AppText>
                </View>
              </>
            ) : depositStatus === 'success' ? (
              <>
                <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary/20">
                  <CheckCircleIcon color={colors.primary} size={48} />
                </View>
                <AppText variant="title" className="text-center font-bold text-primary">
                  Deposit Successful!
                </AppText>
                <AppText className="mt-2 text-center text-sm text-text-secondary">
                  <AppText className="font-bold text-text-primary">
                    {formatUGX(numericAmount)}
                  </AppText>{' '}
                  has been credited to your savings balance.
                </AppText>
                <Button
                  label="Done"
                  onPress={handleCloseModal}
                  className="mt-6 w-full"
                />
              </>
            ) : (
              <>
                <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-secondary/20">
                  <XCircleIcon color={colors.secondary} size={48} />
                </View>
                <AppText variant="title" className="text-center font-bold text-text-primary">
                  Deposit Incomplete
                </AppText>
                <AppText className="mt-2 text-center text-sm text-text-secondary">
                  {resultMessage ||
                    'The payment prompt was cancelled or timed out. No funds were deducted.'}
                </AppText>
                <Button
                  label="Try Again"
                  variant="outline"
                  onPress={handleCloseModal}
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

