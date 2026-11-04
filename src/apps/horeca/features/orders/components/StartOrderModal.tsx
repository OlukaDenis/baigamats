import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import {
  ClipboardDocumentListIcon,
  TableCellsIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Table } from '@horeca/api/schemas';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';

interface StartOrderModalProps {
  table: Table | null;
  visible: boolean;
  onClose: () => void;
  onConfirm: (table: Table) => Promise<void>;
}

export const StartOrderModal: React.FC<StartOrderModalProps> = ({
  table,
  visible,
  onClose,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!table) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(table);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss Modal"
          disabled={isSubmitting}
          onPress={handleClose}
          className="flex-1"
        />

        {/* Bottom Sheet Card */}
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
          className="rounded-t-[32px] bg-surface border-t border-border px-6 pt-3 shadow-2xl"
        >
          {/* Grab handle */}
          <View className="items-center mb-3">
            <View className="h-1.5 w-12 rounded-full bg-border" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-border/50">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mr-3.5">
                <TableCellsIcon color={colors.primary} size={24} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <AppText variant="title" className="text-xl font-extrabold text-text mr-2">
                    Table {table.table_number}
                  </AppText>
                  <Badge label="AVAILABLE" variant="available" size="sm" />
                </View>
                <AppText variant="caption" className="text-text-secondary text-xs mt-0.5">
                  {table.section ?? 'Main Dining'} • Max {table.capacity} Seats
                </AppText>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              disabled={isSubmitting}
              onPress={handleClose}
              className="h-9 w-9 rounded-full bg-background border border-border items-center justify-center active:opacity-70"
              hitSlop={6}
            >
              <XMarkIcon color={colors.onSurfaceVariant} size={18} />
            </Pressable>
          </View>

          {/* Body Content */}
          <View className="py-5">
            <View className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex-row items-center">
              <View className="h-10 w-10 rounded-xl bg-primary/15 items-center justify-center mr-3">
                {isSubmitting ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <ClipboardDocumentListIcon color={colors.primary} size={22} />
                )}
              </View>
              <View className="flex-1">
                <AppText variant="label" className="font-bold text-text text-sm">
                  {isSubmitting ? 'Creating order on server...' : 'Ready to take customer order'}
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-xs mt-0.5">
                  {isSubmitting
                    ? 'Connecting table to server and generating order ID...'
                    : `Starting this order opens Table ${table.table_number} menu so you can add items immediately.`}
                </AppText>
              </View>
            </View>
          </View>

          {/* Action CTAs */}
          <View className="flex-row mt-1">
            <View className="flex-1 mr-2">
              <Button
                label="Cancel"
                variant="secondary"
                size="lg"
                disabled={isSubmitting}
                onPress={handleClose}
              />
            </View>
            <View className="flex-1">
              <Button
                label="Start Order"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                onPress={handleConfirm}
                leftIcon={<ClipboardDocumentListIcon color={colors.onPrimary} size={18} />}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
