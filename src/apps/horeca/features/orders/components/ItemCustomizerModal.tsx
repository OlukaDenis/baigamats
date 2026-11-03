import React, { useState } from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';
import {
  CheckIcon,
  MinusIcon,
  PlusIcon,
  ShieldExclamationIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import type { MenuItem } from '@horeca/api/schemas';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Button } from '@horeca/components/atoms/Button';
import { FormField } from '@horeca/components/molecules/FormField';

interface ItemCustomizerModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onConfirm: (item: MenuItem, qty: number, modifiers: string[], notes?: string, ageVerifiedBy?: string) => void;
}

const COMMON_MODIFIERS = ['No Ice', 'Less Sugar', 'Med-Rare', 'Well-Done', 'Extra Sauce', 'Spicy'];

export const ItemCustomizerModal: React.FC<ItemCustomizerModalProps> = ({
  item,
  onClose,
  onConfirm,
}) => {
  const colors = useHorecaColors();

  const [qty, setQty] = useState<number>(1);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [ageVerified, setAgeVerified] = useState<boolean>(false);

  if (!item) return null;

  const toggleModifier = (mod: string) => {
    setSelectedModifiers(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod],
    );
  };

  const handleAdd = () => {
    if (item.age_restricted && !ageVerified) {
      Alert.alert(
        'Age Verification Required',
        'This item is age-restricted (18+). Please verify customer ID before adding.',
      );
      return;
    }

    onConfirm(
      item,
      qty,
      selectedModifiers,
      notes.trim() ? notes.trim() : undefined,
      item.age_restricted ? 'Alex R.' : undefined,
    );

    // Reset
    setQty(1);
    setSelectedModifiers([]);
    setNotes('');
    setAgeVerified(false);
    onClose();
  };

  const totalPrice = item.price * qty;

  return (
    <Modal
      visible={Boolean(item)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 items-center justify-center p-4">
        <View className="w-full max-w-lg rounded-3xl bg-surface border border-border p-6 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-border/50">
            <View className="flex-1 mr-3">
              <AppText variant="title" className="text-text font-bold" numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText variant="caption" className="text-primary font-semibold mt-0.5">
                UGX {item.price.toLocaleString()} each
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              className="h-9 w-9 rounded-full bg-background border border-border items-center justify-center active:opacity-70"
              hitSlop={6}
            >
              <XMarkIcon color={colors.onSurfaceVariant} size={18} />
            </Pressable>
          </View>

          {/* Quantity Stepper */}
          <View className="flex-row items-center justify-between py-4 border-b border-border/40">
            <View>
              <AppText variant="label" className="font-bold text-text">
                Quantity
              </AppText>
              <AppText variant="caption" className="text-text-secondary">
                Number of portions
              </AppText>
            </View>
            <View className="flex-row items-center bg-background border border-border rounded-2xl p-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
                onPress={() => setQty(prev => Math.max(1, prev - 1))}
                className="h-10 w-10 items-center justify-center rounded-xl bg-surface active:bg-primary/10"
              >
                <MinusIcon color={colors.onSurface} size={18} />
              </Pressable>
              <AppText className="w-12 text-center text-lg font-bold text-text">
                {qty}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
                onPress={() => setQty(prev => prev + 1)}
                className="h-10 w-10 items-center justify-center rounded-xl bg-surface active:bg-primary/10"
              >
                <PlusIcon color={colors.onSurface} size={18} />
              </Pressable>
            </View>
          </View>

          {/* Modifiers Chips */}
          <View className="py-4 border-b border-border/40">
            <AppText variant="label" className="font-bold text-text mb-2.5">
              Kitchen Instructions / Modifiers
            </AppText>
            <View className="flex-row flex-wrap">
              {COMMON_MODIFIERS.map(mod => {
                const isSelected = selectedModifiers.includes(mod);
                return (
                  <Pressable
                    key={mod}
                    accessibilityRole="button"
                    accessibilityLabel={`Modifier ${mod}`}
                    onPress={() => toggleModifier(mod)}
                    className={`mr-2 mb-2 px-3 py-1.5 rounded-xl border flex-row items-center ${
                      isSelected
                        ? 'bg-primary border-primary shadow-sm'
                        : 'bg-background border-border active:bg-surface'
                    }`}
                  >
                    {isSelected ? (
                      <CheckIcon color={colors.onPrimary} size={14} className="mr-1" />
                    ) : null}
                    <AppText
                      variant="caption"
                      className={`font-semibold ${
                        isSelected ? 'text-on-primary' : 'text-text'
                      }`}
                    >
                      {mod}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Special Notes Input */}
          <View className="pt-4">
            <FormField
              label="Special Notes"
              placeholder="e.g. Allergy alert: no nuts, extra crispy"
              value={notes}
              onChangeText={setNotes}
              containerClassName="mb-3"
            />
          </View>

          {/* Age Verification (if age-restricted item) */}
          {item.age_restricted ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ageVerified }}
              onPress={() => setAgeVerified(prev => !prev)}
              className={`flex-row items-center p-3 rounded-xl border mb-4 ${
                ageVerified
                  ? 'bg-status-available/10 border-status-available/30'
                  : 'bg-status-reserved/10 border-status-reserved/30'
              }`}
            >
              <ShieldExclamationIcon
                color={ageVerified ? colors.statusAvailable : colors.statusReserved}
                size={22}
              />
              <View className="ml-2.5 flex-1">
                <AppText variant="label" className="font-bold text-text">
                  Customer Age Verified (18+)
                </AppText>
                <AppText variant="caption" className="text-text-secondary">
                  Tap to confirm customer ID has been inspected
                </AppText>
              </View>
              <View
                className={`h-5 w-5 rounded-md border items-center justify-center ${
                  ageVerified ? 'bg-status-available border-status-available' : 'border-border bg-surface'
                }`}
              >
                {ageVerified ? <CheckIcon color="#ffffff" size={14} /> : null}
              </View>
            </Pressable>
          ) : null}

          {/* Action Button */}
          <Button
            label={`Add ${qty} to Order • UGX ${totalPrice.toLocaleString()}`}
            variant="primary"
            size="lg"
            onPress={handleAdd}
            className="mt-2"
          />
        </View>
      </View>
    </Modal>
  );
};
