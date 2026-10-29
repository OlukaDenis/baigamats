import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import {
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { AlertBanner } from '../../../components/molecules/AlertBanner';
import { FormField } from '../../../components/molecules/FormField';
import { useTheme } from '../../../theme/ThemeProvider';
import { useAuthStore } from '../../auth/store/authStore';
import {
  useAddBeneficiaryMutation,
  useSendBeneficiaryOtpMutation,
} from '../hooks/useTransfers';
import { addBeneficiaryRequestSchema } from '../schemas/beneficiarySchemas';

export type AddBeneficiaryModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function AddBeneficiaryModal({ visible, onClose }: AddBeneficiaryModalProps) {
  const { colors } = useTheme();
  const member = useAuthStore(state => state.member);

  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sendOtpMutation = useSendBeneficiaryOtpMutation();
  const addBeneficiaryMutation = useAddBeneficiaryMutation();

  const handleSendOtp = async () => {
    setErrorMessage(null);
    if (!phone.trim()) {
      setErrorMessage('Please enter a mobile money phone number');
      return;
    }

    try {
      await sendOtpMutation.mutateAsync();
      setOtpSent(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to send verification SMS. Please try again.');
      }
    }
  };

  const handleSave = async () => {
    setErrorMessage(null);

    const validation = addBeneficiaryRequestSchema.safeParse({
      phone,
      label: label.trim() || undefined,
      otp,
    });

    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message || 'Please verify form fields');
      return;
    }

    try {
      await addBeneficiaryMutation.mutateAsync(validation.data);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save beneficiary. Please try again.');
      }
    }
  };

  const handleResetAndClose = () => {
    setPhone('');
    setLabel('');
    setOtp('');
    setOtpSent(false);
    setErrorMessage(null);
    onClose();
  };

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
            <AppText variant="title" className="font-bold text-text-primary">
              Add Withdrawal Number
            </AppText>
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

          <FormField
            label="Mobile Money Phone Number"
            placeholder="e.g. 0772123456"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            leftIcon={<DevicePhoneMobileIcon color={colors.textSecondary} size={20} />}
            helperText="Payouts are sent to this MTN MoMo or Airtel Money number"
          />

          <FormField
            label="Label (Optional)"
            placeholder="e.g. My MTN SIM or Brother's Airtel"
            value={label}
            onChangeText={setLabel}
            maxLength={30}
          />

          {!otpSent ? (
            <View className="my-2">
              <Button
                label="Send SMS Verification Code"
                onPress={handleSendOtp}
                loading={sendOtpMutation.isPending}
                disabled={sendOtpMutation.isPending || !phone.trim()}
              />
              <AppText className="mt-2 text-center text-xs text-text-secondary">
                A 6-digit OTP will be sent to your registered phone ({member?.phone}).
              </AppText>
            </View>
          ) : (
            <View className="my-2">
              <FormField
                label="6-Digit Verification Code"
                placeholder="123456"
                value={otp}
                onChangeText={text => setOtp(text.replace(/\D/g, '').slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
                helperText={`Sent to your registered phone (${member?.phone})`}
              />

              <Button
                label="Verify & Save Number"
                onPress={handleSave}
                loading={addBeneficiaryMutation.isPending}
                disabled={addBeneficiaryMutation.isPending || otp.length !== 6}
                className="mt-2"
              />
            </View>
          )}

          <View className="mt-4 flex-row items-center gap-2 rounded-xl bg-background p-3 border border-border">
            <ShieldCheckIcon color={colors.textSecondary} size={20} />
            <AppText className="flex-1 text-xs text-text-secondary">
              Security Notice: Newly added numbers activate after a 24-hour waiting
              period before withdrawals can be initiated.
            </AppText>
          </View>
        </View>
      </View>
    </Modal>
  );
}

