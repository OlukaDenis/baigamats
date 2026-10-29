import { useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyIcon, CheckCircleIcon } from 'react-native-heroicons/outline';

import type { AuthStackParamList } from '../../../app/navigation/types';
import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { AlertBanner } from '../../../components/molecules/AlertBanner';
import { FormField } from '../../../components/molecules/FormField';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';
import { ApiError } from '../../../services/api/client';
import { memberAuthApi } from '../api/memberAuthApi';
import { memberPinSchema } from '../schemas/memberAuthSchemas';
import { useAuthStore } from '../store/authStore';

export function ChangePinScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList, 'ChangePin'>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'ChangePin'>>();

  const isMandatory = route.params?.isMandatory ?? false;
  const setMustChangePassword = useAuthStore(
    state => state.setMustChangePassword,
  );

  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    current?: string;
    next?: string;
    confirm?: string;
  }>({});

  const handleChangePin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const errors: { current?: string; next?: string; confirm?: string } = {};

    if (!isMandatory && !currentPin) {
      errors.current = 'Enter your current PIN';
    }

    const pinValidation = memberPinSchema.safeParse(nextPin);
    if (!pinValidation.success) {
      errors.next = 'PIN must be exactly 4 or 5 digits';
    }

    if (nextPin !== confirmPin) {
      errors.confirm = 'The confirmed PIN does not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      await memberAuthApi.changePassword({
        current: isMandatory ? undefined : currentPin,
        next: nextPin,
      });

      await setMustChangePassword(false);
      setSuccessMessage('Your security PIN has been updated successfully.');

      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.errorCode === 'weak_password') {
          setErrorMessage(
            err.message || 'The selected PIN is too weak or predictable (e.g. 1234 or 0000).',
          );
        } else if (err.errorCode === 'confirmation_failed') {
          setErrorMessage('Current PIN was incorrect. Please try again.');
        } else {
          setErrorMessage(err.message || 'Failed to update PIN. Please try again.');
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Unable to change PIN. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenTemplate>
      <View className="mb-6 items-center">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-secondary shadow-sm">
          <KeyIcon
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
          {isMandatory ? 'Set Permanent PIN' : 'Change Security PIN'}
        </AppText>
        <AppText className="mt-2 text-center text-sm text-text-secondary">
          {isMandatory
            ? 'You were issued a temporary password. Choose a secure 4 or 5 digit PIN to continue.'
            : 'Enter your current PIN and choose a new 4 or 5 digit PIN.'}
        </AppText>
      </View>

      {errorMessage ? <AlertBanner message={errorMessage} /> : null}

      {successMessage ? (
        <View
          accessible
          accessibilityRole="alert"
          className="mb-5 flex-row items-center rounded-xl border border-primary/20 bg-surface p-4 shadow-sm"
        >
          <CheckCircleIcon
            color={colors.primary}
            size={22}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <AppText variant="label" className="ml-3 flex-1 font-semibold text-primary">
            {successMessage}
          </AppText>
        </View>
      ) : null}

      <View className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        {!isMandatory ? (
          <FormField
            label="Current PIN"
            placeholder="••••"
            value={currentPin}
            onChangeText={text => {
              const cleaned = text.replace(/[^0-9]/g, '').slice(0, 5);
              setCurrentPin(cleaned);
              if (fieldErrors.current) {
                setFieldErrors(prev => ({ ...prev, current: undefined }));
              }
            }}
            keyboardType="numeric"
            isPassword
            maxLength={5}
            error={fieldErrors.current}
          />
        ) : null}

        <FormField
          label="New PIN (4 or 5 digits)"
          placeholder="••••"
          value={nextPin}
          onChangeText={text => {
            const cleaned = text.replace(/[^0-9]/g, '').slice(0, 5);
            setNextPin(cleaned);
            if (fieldErrors.next) {
              setFieldErrors(prev => ({ ...prev, next: undefined }));
            }
          }}
          keyboardType="numeric"
          isPassword
          maxLength={5}
          error={fieldErrors.next}
          helperText="Avoid sequences like 1234 or repeating numbers like 1111"
        />

        <FormField
          label="Confirm New PIN"
          placeholder="••••"
          value={confirmPin}
          onChangeText={text => {
            const cleaned = text.replace(/[^0-9]/g, '').slice(0, 5);
            setConfirmPin(cleaned);
            if (fieldErrors.confirm) {
              setFieldErrors(prev => ({ ...prev, confirm: undefined }));
            }
          }}
          keyboardType="numeric"
          isPassword
          maxLength={5}
          error={fieldErrors.confirm}
        />

        <Button
          label="Update PIN"
          onPress={handleChangePin}
          loading={loading}
          disabled={loading || Boolean(successMessage)}
          className="mt-4"
        />
      </View>
    </ScreenTemplate>
  );
}
