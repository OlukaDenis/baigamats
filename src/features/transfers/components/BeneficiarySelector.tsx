import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import {
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  LockClosedIcon,
  PlusCircleIcon,
  TrashIcon,
} from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { useTheme } from '../../../theme/ThemeProvider';
import {
  useBeneficiariesQuery,
  useDeleteBeneficiaryMutation,
} from '../hooks/useTransfers';
import { AddBeneficiaryModal } from './AddBeneficiaryModal';

export type BeneficiarySelectorProps = {
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function BeneficiarySelector({
  selectedId,
  onSelect,
}: BeneficiarySelectorProps) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const { data: beneficiaries, isLoading } = useBeneficiariesQuery();
  const deleteMutation = useDeleteBeneficiaryMutation();

  const count = beneficiaries?.length || 0;

  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-center justify-between">
        <AppText variant="label" className="font-semibold text-text-primary">
          Saved Withdrawal Numbers ({count}/3)
        </AppText>
        {count < 3 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add new withdrawal number"
            onPress={() => setModalVisible(true)}
            className="flex-row items-center gap-1"
          >
            <PlusCircleIcon color={colors.primary} size={18} />
            <AppText variant="label" className="text-xs text-primary font-bold">
              Add Number
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View className="py-4 items-center">
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : count === 0 ? (
        <View className="rounded-2xl border border-dashed border-border bg-background p-4 items-center">
          <DevicePhoneMobileIcon color={colors.textSecondary} size={28} />
          <AppText className="mt-2 text-xs text-text-secondary text-center">
            No withdrawal numbers saved yet. Add a verified MTN or Airtel number to withdraw funds.
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add first withdrawal number"
            onPress={() => setModalVisible(true)}
            className="mt-3 rounded-xl bg-primary px-3.5 py-2"
          >
            <AppText variant="label" className="text-xs font-semibold text-on-primary">
              Add Withdrawal Number
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View className="gap-2">
          {beneficiaries?.map(b => {
            const isSelected = selectedId === b.id;
            const isUsable = b.usable;

            return (
              <Pressable
                key={b.id}
                accessibilityRole="button"
                accessibilityLabel={`Withdraw to ${b.label || b.phone_masked}`}
                disabled={!isUsable}
                onPress={() => onSelect(b.id)}
                className={`flex-row items-center justify-between rounded-2xl border p-3.5 ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : isUsable
                      ? 'border-border bg-background'
                      : 'border-border/60 bg-surface/80 opacity-75'
                }`}
              >
                <View className="flex-1 flex-row items-center gap-3">
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-xl ${
                      isSelected ? 'bg-primary' : 'bg-surface'
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircleIcon color={colors.onPrimary} size={20} />
                    ) : isUsable ? (
                      <DevicePhoneMobileIcon color={colors.textSecondary} size={20} />
                    ) : (
                      <LockClosedIcon color={colors.secondary} size={18} />
                    )}
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <AppText className="font-semibold text-text-primary text-sm">
                        {b.phone_masked}
                      </AppText>
                      {b.label ? (
                        <View className="rounded-full bg-border/60 px-2 py-0.5">
                          <AppText className="text-[10px] text-text-secondary">
                            {b.label}
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    {!isUsable ? (
                      <AppText className="mt-0.5 text-xs text-secondary font-medium">
                        Activates {b.usable_from || 'in 24 hours'} (Security cooldown)
                      </AppText>
                    ) : null}
                  </View>
                </View>

                {/* Delete button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete number"
                  onPress={() => deleteMutation.mutate(b.id)}
                  hitSlop={8}
                  className="p-1"
                >
                  <TrashIcon color={colors.textSecondary} size={18} />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      )}

      <AddBeneficiaryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

