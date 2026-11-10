import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon,
  XCircleIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../atoms/AppText';
import { Button, type ButtonVariant } from '../../atoms/Button';
import { useHorecaColors } from '../../../theme/colors';
import { activityCaptureProps } from '../../../features/auth/utils/inactivityTracker';
import { useAppModalStore, type ModalType } from './appModalStore';

export const GlobalBottomSheetModal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();

  const isOpen = useAppModalStore(state => state.isOpen);
  const type = useAppModalStore(state => state.type);
  const title = useAppModalStore(state => state.title);
  const message = useAppModalStore(state => state.message);
  const confirmText = useAppModalStore(state => state.confirmText);
  const cancelText = useAppModalStore(state => state.cancelText);
  const confirmVariant = useAppModalStore(state => state.confirmVariant);
  const isDestructive = useAppModalStore(state => state.isDestructive);
  const dismissible = useAppModalStore(state => state.dismissible);
  const isLoading = useAppModalStore(state => state.isLoading);
  const onConfirm = useAppModalStore(state => state.onConfirm);
  const onCancel = useAppModalStore(state => state.onCancel);
  const hideModal = useAppModalStore(state => state.hideModal);
  const setLoading = useAppModalStore(state => state.setLoading);

  if (!isOpen) return null;

  const handleBackdropPress = () => {
    if (!dismissible || isLoading) return;
    hideModal();
  };

  const handleConfirmPress = async () => {
    if (isLoading) return;
    if (onConfirm) {
      try {
        setLoading(true);
        await onConfirm();
        if (useAppModalStore.getState().onConfirm === onConfirm) {
          useAppModalStore.setState({ isOpen: false, isLoading: false });
        }
      } catch (err) {
        console.error('[GlobalBottomSheetModal] Confirm handler error:', err);
        setLoading(false);
      }
    } else {
      useAppModalStore.setState({ isOpen: false, isLoading: false });
    }
  };

  const handleCancelPress = () => {
    if (isLoading) return;
    hideModal();
  };

  const isConfirmation = type === 'confirmation';

  const renderIcon = () => {
    const iconSize = 32;
    if (isDestructive) {
      return (
        <View className="h-14 w-14 rounded-2xl bg-error/15 border border-error/30 items-center justify-center mb-3">
          <TrashIcon color={colors.error} size={iconSize} />
        </View>
      );
    }

    switch (type) {
      case 'success':
        return (
          <View className="h-14 w-14 rounded-2xl bg-status-available/15 border border-status-available/30 items-center justify-center mb-3">
            <CheckCircleIcon color={colors.statusAvailable} size={iconSize} />
          </View>
        );
      case 'error':
        return (
          <View className="h-14 w-14 rounded-2xl bg-error/15 border border-error/30 items-center justify-center mb-3">
            <XCircleIcon color={colors.error} size={iconSize} />
          </View>
        );
      case 'warning':
      case 'confirmation':
        return (
          <View className="h-14 w-14 rounded-2xl bg-status-reserved/15 border border-status-reserved/30 items-center justify-center mb-3">
            <ExclamationTriangleIcon color={colors.statusReserved} size={iconSize} />
          </View>
        );
      case 'info':
      default:
        return (
          <View className="h-14 w-14 rounded-2xl bg-primary/15 border border-primary/30 items-center justify-center mb-3">
            <InformationCircleIcon color={colors.primary} size={iconSize} />
          </View>
        );
    }
  };

  const buttonVariant: ButtonVariant =
    confirmVariant === 'destructive' ? 'danger' : confirmVariant === 'success' ? 'success' : 'primary';

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleBackdropPress}
      statusBarTranslucent
    >
      <View {...activityCaptureProps} className="flex-1 justify-end bg-black/60">
        {/* Backdrop tap target */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss Modal"
          onPress={handleBackdropPress}
          className="flex-1"
        />

        {/* Bottom Sheet Card */}
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
          className="bg-surface rounded-t-3xl border-t border-x border-border p-5 pt-3 shadow-2xl"
        >
          {/* Top Pill Handle */}
          <View className="items-center mb-4">
            <View className="h-1.5 w-12 rounded-full bg-border" />
          </View>

          {/* Icon Header */}
          <View className="items-center">{renderIcon()}</View>

          {/* Title & Body */}
          <View className="items-center px-2 mb-6">
            <AppText variant="title" className="text-xl font-bold text-text text-center mb-2">
              {title}
            </AppText>
            {message ? (
              <AppText variant="body" className="text-text-secondary text-center text-sm leading-5">
                {message}
              </AppText>
            ) : null}
          </View>

          {/* Action Buttons */}
          {isConfirmation ? (
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Button
                  label={cancelText}
                  variant="secondary"
                  size="md"
                  disabled={isLoading}
                  onPress={handleCancelPress}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={confirmText}
                  variant={buttonVariant}
                  size="md"
                  loading={isLoading}
                  disabled={isLoading}
                  onPress={handleConfirmPress}
                />
              </View>
            </View>
          ) : (
            <View className="w-full">
              <Button
                label={confirmText}
                variant={buttonVariant}
                size="md"
                loading={isLoading}
                disabled={isLoading}
                onPress={handleConfirmPress}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
