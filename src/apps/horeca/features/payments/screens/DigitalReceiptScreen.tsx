import React from 'react';
import { Alert, View } from 'react-native';
import {
  CheckCircleIcon,
  DocumentCheckIcon,
  PrinterIcon,
  QrCodeIcon,
  ShareIcon,
} from 'react-native-heroicons/outline';
import { mockReceipt } from '@horeca/mock/horecaMockData';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { HorecaAppBar } from '@horeca/components/organisms/HorecaAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';

interface DigitalReceiptScreenProps {
  onDone: () => void;
  onLockTerminal: () => void;
}

export const DigitalReceiptScreen: React.FC<DigitalReceiptScreenProps> = ({
  onDone,
  onLockTerminal,
}) => {
  const colors = useHorecaColors();
  const receipt = mockReceipt;

  const handlePrint = () => {
    Alert.alert('Printing', 'Thermal receipt sent to Bluetooth ESC/POS printer.');
  };

  const handleShare = () => {
    Alert.alert('Digital Receipt', 'Receipt link copied to clipboard and ready to share via WhatsApp / SMS.');
  };

  return (
    <ScreenTemplate
      scrollable
      withBottomInset
      className="bg-background"
      header={
        <HorecaAppBar
          title="Digital Receipt"
          subtitle="TRANSACTION COMPLETED"
          onLockPress={onLockTerminal}
        />
      }
      contentContainerClassName="px-4 py-5"
    >
      {/* Top Status Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <View className="h-2 w-2 rounded-full bg-status-available mr-1.5" />
          <AppText variant="caption" className="text-status-available font-bold text-[11px]">
            LEDGER SYNCHRONIZED
          </AppText>
        </View>
        <Badge label="CUSTOMER COPY" variant="neutral" size="sm" />
      </View>

      {/* Paper Receipt Card */}
      <View className="rounded-3xl bg-surface border border-border p-6 shadow-md mb-6">
        {/* Header Branding */}
        <View className="items-center pb-4 border-b border-border/50">
          <View className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-2">
            <DocumentCheckIcon color={colors.primary} size={24} />
          </View>
          <AppText variant="title" className="text-xl font-extrabold text-text text-center">
            {receipt.business}
          </AppText>
          <AppText variant="caption" className="text-text-secondary text-center mt-0.5">
            Kampala, Uganda • Tel: +256 700 123 456
          </AppText>
          <AppText variant="caption" className="text-text-secondary text-center text-[11px] mt-0.5">
            TIN: {receipt.tin} • VAT: 18% INCLUDED
          </AppText>

          {/* Paid Stamp Badge */}
          <View className="mt-3 px-3.5 py-1.5 rounded-full bg-status-available/15 border border-status-available/30 flex-row items-center">
            <CheckCircleIcon color={colors.statusAvailable} size={16} className="mr-1.5" />
            <AppText variant="caption" className="text-status-available font-bold text-xs">
              SETTLED & PAID IN FULL
            </AppText>
          </View>
        </View>

        {/* Metadata Grid */}
        <View className="flex-row justify-between py-4 border-b border-border/40">
          <View>
            <AppText variant="caption" className="text-text-secondary uppercase text-[10px] font-semibold">
              Order #
            </AppText>
            <AppText variant="label" className="font-bold text-text">
              {receipt.orderNumber}
            </AppText>
          </View>
          <View>
            <AppText variant="caption" className="text-text-secondary uppercase text-[10px] font-semibold">
              Table / Section
            </AppText>
            <AppText variant="label" className="font-bold text-text">
              {receipt.table} • Main Dining
            </AppText>
          </View>
          <View className="items-end">
            <AppText variant="caption" className="text-text-secondary uppercase text-[10px] font-semibold">
              Date & Time
            </AppText>
            <AppText variant="label" className="font-bold text-text">
              24 Oct 13:42
            </AppText>
          </View>
        </View>

        {/* Receipt Lines Table */}
        <View className="py-4 border-b border-border/40">
          <View className="flex-row justify-between pb-2 mb-2 border-b border-border/30">
            <AppText variant="caption" className="text-text-secondary uppercase text-[10px] font-semibold">
              Item / Qty
            </AppText>
            <AppText variant="caption" className="text-text-secondary uppercase text-[10px] font-semibold">
              Total (UGX)
            </AppText>
          </View>

          {receipt.lines.map((line, index) => (
            <View key={index} className="flex-row justify-between py-1.5">
              <AppText variant="label" className="text-text font-medium flex-1 mr-2" numberOfLines={1}>
                {line.qty}x {line.name}
              </AppText>
              <AppText variant="label" className="text-text font-bold">
                {line.lineTotal.toLocaleString()}
              </AppText>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View className="py-4 border-b border-border/40">
          <View className="flex-row justify-between py-1">
            <AppText variant="caption" className="text-text-secondary">
              Subtotal
            </AppText>
            <AppText variant="caption" className="text-text font-medium">
              UGX 457,627
            </AppText>
          </View>
          <View className="flex-row justify-between py-1">
            <AppText variant="caption" className="text-text-secondary">
              VAT (18% Statutory Tax)
            </AppText>
            <AppText variant="caption" className="text-text font-medium">
              UGX 82,373
            </AppText>
          </View>
          <View className="flex-row justify-between pt-2 mt-1 border-t border-border/30 items-center">
            <AppText variant="title" className="text-lg font-bold text-text">
              GRAND TOTAL
            </AppText>
            <AppText variant="title" className="text-xl font-extrabold text-primary">
              UGX {receipt.total.toLocaleString()}
            </AppText>
          </View>
        </View>

        {/* Fiscal Compliance Footer */}
        <View className="items-center pt-4">
          <View className="h-10 w-10 rounded-xl bg-background border border-border items-center justify-center mb-1.5">
            <QrCodeIcon color={colors.onSurfaceVariant} size={22} />
          </View>
          <AppText variant="caption" className="text-text-secondary font-mono text-[10px]">
            EFRIS FDN: {receipt.fdn}
          </AppText>
          <AppText variant="caption" className="text-text-secondary text-[10px] text-center mt-1">
            Thank you for dining with us! Please retain this fiscal receipt.
          </AppText>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="space-y-3">
        <View className="flex-row mb-3">
          <View className="flex-1 mr-2">
            <Button
              label="Print Receipt"
              variant="secondary"
              onPress={handlePrint}
              leftIcon={<PrinterIcon color={colors.primary} size={18} />}
            />
          </View>
          <View className="flex-1">
            <Button
              label="Share Receipt"
              variant="secondary"
              onPress={handleShare}
              leftIcon={<ShareIcon color={colors.primary} size={18} />}
            />
          </View>
        </View>

        <Button
          label="Done • Next Customer"
          variant="primary"
          size="lg"
          onPress={onDone}
        />
      </View>
    </ScreenTemplate>
  );
};
