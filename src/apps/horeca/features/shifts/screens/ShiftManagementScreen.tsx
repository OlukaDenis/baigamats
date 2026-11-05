import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import {
  BanknotesIcon,
  LockClosedIcon,
  LockOpenIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { FormField } from '@horeca/components/molecules/FormField';
import { HorecaAppBar } from '@horeca/components/organisms/HorecaAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { appModal } from '@horeca/components/molecules/modal/appModalStore';

interface ShiftManagementScreenProps {
  onLockTerminal: () => void;
  onOrdersPress?: () => void;
  onProfilePress?: () => void;
}

export const ShiftManagementScreen: React.FC<ShiftManagementScreenProps> = ({
  onLockTerminal,
  onOrdersPress,
  onProfilePress,
}) => {
  const colors = useHorecaColors();

  const currentShift = useHorecaStore(state => state.currentShift);
  const openShiftOptimistic = useHorecaStore(state => state.openShiftOptimistic);
  const closeShiftOptimistic = useHorecaStore(state => state.closeShiftOptimistic);
  const isOnline = useHorecaStore(state => state.isOnline);

  const [isOpenModalVisible, setIsOpenModalVisible] = useState<boolean>(false);
  const [isCloseModalVisible, setIsCloseModalVisible] = useState<boolean>(false);
  const [openingFloatInput, setOpeningFloatInput] = useState<string>('50000');
  const [countedCashInput, setCountedCashInput] = useState<string>('590000');
  const [closingNote, setClosingNote] = useState<string>('');

  const isShiftOpen = currentShift && currentShift.status === 'open';
  const openingFloat = currentShift?.opening_float || 0;
  const cashSales = 540_000;
  const expectedCash = openingFloat + cashSales;

  const countedCash = parseInt(countedCashInput.replace(/\D/g, '') || '0', 10);
  const variance = countedCash - expectedCash;

  const handleOpenShift = () => {
    const floatVal = parseInt(openingFloatInput.replace(/\D/g, '') || '0', 10);
    if (floatVal < 0) {
      appModal.warning('Invalid Float', 'Please enter a valid cash float.');
      return;
    }
    openShiftOptimistic(floatVal);
    setIsOpenModalVisible(false);
    appModal.success('Shift Opened', `Cash drawer shift opened with UGX ${floatVal.toLocaleString()} float.`);
  };

  const handleCloseShift = () => {
    closeShiftOptimistic(countedCash, closingNote.trim() ? closingNote.trim() : undefined);
    setIsCloseModalVisible(false);
    appModal.success(
      'Shift Closed',
      `Shift closed successfully. Variance recorded: ${variance >= 0 ? '+' : ''}${variance.toLocaleString()} UGX.`
    );
  };

  return (
    <ScreenTemplate
      scrollable
      withBottomInset
      className="bg-background"
      header={
        <HorecaAppBar
          title="Shift & Drawer"
          subtitle={isShiftOpen ? 'DRAWER ACTIVE' : 'DRAWER LOCKED'}
          isOnline={isOnline}
          onOrdersPress={onOrdersPress}
          onLockPress={onLockTerminal}
          onProfilePress={onProfilePress}
        />
      }
      contentContainerClassName="px-4 py-5"
    >
      {/* Status Card Banner */}
      <View className="rounded-3xl bg-surface border border-border p-5 mb-5 shadow-sm">
        <View className="flex-row items-center justify-between pb-3 border-b border-border/50">
          <View className="flex-row items-center">
            <View
              className={`h-3 w-3 rounded-full mr-2 ${
                isShiftOpen ? 'bg-status-available' : 'bg-error'
              }`}
            />
            <AppText variant="title" className="text-lg font-bold text-text">
              {isShiftOpen ? 'Active Cash Shift' : 'No Open Shift'}
            </AppText>
          </View>
          <Badge
            label={isShiftOpen ? 'ACTIVE REGISTER' : 'CLOSED'}
            variant={isShiftOpen ? 'success' : 'neutral'}
            size="sm"
          />
        </View>

        {isShiftOpen ? (
          <>
            <View className="flex-row justify-between py-4 border-b border-border/40">
              <View>
                <AppText variant="caption" className="text-text-secondary text-[10px] font-semibold uppercase">
                  Opened At
                </AppText>
                <AppText variant="label" className="font-bold text-text mt-0.5">
                  08:30 AM (Today)
                </AppText>
              </View>
              <View>
                <AppText variant="caption" className="text-text-secondary text-[10px] font-semibold uppercase">
                  Staff Member
                </AppText>
                <AppText variant="label" className="font-bold text-text mt-0.5">
                  Alex R. (Manager)
                </AppText>
              </View>
              <View className="items-end">
                <AppText variant="caption" className="text-text-secondary text-[10px] font-semibold uppercase">
                  Starting Float
                </AppText>
                <AppText variant="label" className="font-bold text-primary mt-0.5">
                  UGX {openingFloat.toLocaleString()}
                </AppText>
              </View>
            </View>

            {/* Reconciliation Totals */}
            <View className="py-4">
              <View className="flex-row justify-between py-1.5">
                <AppText variant="caption" className="text-text-secondary">
                  Opening Drawer Cash
                </AppText>
                <AppText variant="label" className="text-text font-medium">
                  UGX {openingFloat.toLocaleString()}
                </AppText>
              </View>
              <View className="flex-row justify-between py-1.5">
                <AppText variant="caption" className="text-text-secondary">
                  Shift Cash Sales
                </AppText>
                <AppText variant="label" className="text-status-available font-bold">
                  + UGX {cashSales.toLocaleString()}
                </AppText>
              </View>
              <View className="flex-row justify-between pt-2.5 mt-1 border-t border-border/40 items-center">
                <AppText variant="label" className="font-bold text-text">
                  Expected In Drawer
                </AppText>
                <AppText variant="title" className="text-xl font-extrabold text-primary">
                  UGX {expectedCash.toLocaleString()}
                </AppText>
              </View>
            </View>

            {/* Action to Close */}
            <View className="pt-2">
              <Button
                label="Count Cash & Close Shift"
                variant="danger"
                onPress={() => setIsCloseModalVisible(true)}
                leftIcon={<LockClosedIcon color={colors.onError} size={18} />}
              />
            </View>
          </>
        ) : (
          <View className="py-6 items-center">
            <View className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-3">
              <LockOpenIcon color={colors.primary} size={28} />
            </View>
            <AppText variant="title" className="text-text font-bold mb-1">
              Start Cash Shift
            </AppText>
            <AppText variant="caption" className="text-text-secondary text-center max-w-xs mb-5">
              Open the register drawer and record the starting cash float before taking orders.
            </AppText>
            <Button
              label="Open Cash Shift"
              variant="primary"
              size="lg"
              onPress={() => setIsOpenModalVisible(true)}
              leftIcon={<BanknotesIcon color={colors.onPrimary} size={20} />}
            />
          </View>
        )}
      </View>

      {/* OPEN SHIFT MODAL */}
      <Modal
        visible={isOpenModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpenModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="w-full max-w-md rounded-3xl bg-surface border border-border p-6 shadow-2xl">
            <View className="flex-row items-center justify-between pb-3 mb-4 border-b border-border/50">
              <AppText variant="title" className="font-bold text-text">
                Open Cash Shift
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setIsOpenModalVisible(false)}
                className="h-8 w-8 rounded-full bg-background border border-border items-center justify-center active:opacity-70"
              >
                <XMarkIcon color={colors.onSurfaceVariant} size={16} />
              </Pressable>
            </View>

            <FormField
              label="Starting Float Cash (UGX)"
              value={openingFloatInput}
              onChangeText={setOpeningFloatInput}
              keyboardType="numeric"
              placeholder="50000"
              helperText="Count physical banknotes in drawer before entering."
            />

            <Button
              label="Confirm & Open Shift"
              variant="primary"
              size="lg"
              onPress={handleOpenShift}
              className="mt-3"
            />
          </View>
        </View>
      </Modal>

      {/* CLOSE SHIFT MODAL */}
      <Modal
        visible={isCloseModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCloseModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="w-full max-w-md rounded-3xl bg-surface border border-border p-6 shadow-2xl">
            <View className="flex-row items-center justify-between pb-3 mb-4 border-b border-border/50">
              <AppText variant="title" className="font-bold text-text">
                Shift Reconciliation
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setIsCloseModalVisible(false)}
                className="h-8 w-8 rounded-full bg-background border border-border items-center justify-center active:opacity-70"
              >
                <XMarkIcon color={colors.onSurfaceVariant} size={16} />
              </Pressable>
            </View>

            <View className="p-3.5 rounded-2xl bg-background border border-border mb-4">
              <View className="flex-row justify-between mb-1">
                <AppText variant="caption" className="text-text-secondary">Expected Cash:</AppText>
                <AppText variant="label" className="font-bold text-text">UGX {expectedCash.toLocaleString()}</AppText>
              </View>
              <View className="flex-row justify-between items-center pt-2 border-t border-border/40">
                <AppText variant="caption" className="text-text-secondary">Drawer Variance:</AppText>
                <Badge
                  label={`${variance >= 0 ? '+' : ''}${variance.toLocaleString()} UGX`}
                  variant={variance === 0 ? 'success' : variance > 0 ? 'warning' : 'danger'}
                  size="sm"
                />
              </View>
            </View>

            <FormField
              label="Physical Counted Cash (UGX)"
              value={countedCashInput}
              onChangeText={setCountedCashInput}
              keyboardType="numeric"
              placeholder="590000"
            />

            <FormField
              label="Notes / Discrepancy Reason"
              value={closingNote}
              onChangeText={setClosingNote}
              placeholder="Optional notes for manager review..."
            />

            <Button
              label="Close Shift & Lock Register"
              variant="danger"
              size="lg"
              onPress={handleCloseShift}
              className="mt-2"
            />
          </View>
        </View>
      </Modal>
    </ScreenTemplate>
  );
};
