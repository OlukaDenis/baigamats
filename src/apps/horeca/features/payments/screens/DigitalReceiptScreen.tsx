import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  CheckCircleIcon,
  DocumentCheckIcon,
  PrinterIcon,
  QrCodeIcon,
  ShareIcon,
} from 'react-native-heroicons/outline';
import { horecaApi } from '@horeca/api/horecaApiClient';
import type { Receipt } from '@horeca/api/schemas';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { mockReceipt } from '@horeca/mock/horecaMockData';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { HorecaSubAppBar } from '@horeca/components/organisms/HorecaSubAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { appModal } from '@horeca/components/molecules/modal/appModalStore';
import type { CompletedPaymentResult } from './PaymentCheckoutScreen';

interface DigitalReceiptScreenProps {
  saleInfo?: CompletedPaymentResult | null;
  onDone: () => void;
  onLockTerminal: () => void;
}

export const DigitalReceiptScreen: React.FC<DigitalReceiptScreenProps> = ({
  saleInfo,
  onDone,
}) => {
  const colors = useHorecaColors();
  const orders = useHorecaStore(state => state.orders);
  const tables = useHorecaStore(state => state.tables);
  const activeTableId = useHorecaStore(state => state.activeTableId);

  const [fetchedReceipt, setFetchedReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    if (!saleInfo?.orderId || saleInfo.orderId.startsWith('temp-ord-')) return;
    let mounted = true;
    horecaApi
      .getReceipt(saleInfo.orderId)
      .then(res => {
        if (mounted && res) {
          setFetchedReceipt(res);
        }
      })
      .catch(() => {
        // Fallback to local order + saleInfo
      });
    return () => {
      mounted = false;
    };
  }, [saleInfo?.orderId]);

  const settledOrder = saleInfo?.orderId ? orders[saleInfo.orderId] : undefined;
  const settledTable =
    tables.find(t => t.id === (settledOrder?.table_id ?? activeTableId)) ?? tables[0];

  const receipt = useMemo<Receipt>(() => {
    if (fetchedReceipt) {
      return {
        ...mockReceipt,
        ...fetchedReceipt,
        orderNumber: saleInfo?.saleNumber || fetchedReceipt.orderNumber,
      };
    }

    if (settledOrder && settledOrder.items && settledOrder.items.length > 0) {
      const lines = settledOrder.items.map(it => ({
        name: it.item_name,
        qty: it.qty,
        unitPrice: it.unit_price,
        discount: it.discount_amount ?? 0,
        lineTotal: it.unit_price * it.qty - (it.discount_amount ?? 0),
      }));
      const itemsTotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
      const total = saleInfo?.amount || settledOrder.total_amount || itemsTotal;

      return {
        ...mockReceipt,
        orderNumber: saleInfo?.saleNumber || settledOrder.order_number,
        table: settledTable ? `T${settledTable.table_number}` : mockReceipt.table,
        lines,
        itemsTotal,
        total,
      };
    }

    return {
      ...mockReceipt,
      orderNumber: saleInfo?.saleNumber || mockReceipt.orderNumber,
      total: saleInfo?.amount || mockReceipt.total,
    };
  }, [fetchedReceipt, saleInfo, settledOrder, settledTable]);

  const subtotal = Math.round(receipt.total / 1.18);
  const vatAmount = Math.max(0, receipt.total - subtotal);

  const handlePrint = () => {
    appModal.info('Printing', 'Thermal receipt sent to Bluetooth ESC/POS printer.');
  };

  const handleShare = () => {
    appModal.success(
      'Digital Receipt',
      'Receipt link copied to clipboard and ready to share via WhatsApp / SMS.',
    );
  };

  return (
    <ScreenTemplate
      scrollable
      withBottomInset
      className="bg-background"
      header={<HorecaSubAppBar title="Digital Receipt" onBack={onDone} />}
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
        <Badge
          label={
            saleInfo?.method === 'mobile_money'
              ? 'PAID • MOBILE MONEY'
              : saleInfo?.method === 'cash'
                ? 'PAID • CASH'
                : 'CUSTOMER COPY'
          }
          variant="neutral"
          size="sm"
        />
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
              Sale / Order #
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
              {receipt.table} • {settledTable?.section ?? 'Main Dining'}
            </AppText>
          </View>
          <View className="items-end">
            <AppText variant="caption" className="text-text-secondary uppercase text-[10px] font-semibold">
              Method
            </AppText>
            <AppText variant="label" className="font-bold text-text">
              {saleInfo?.method === 'mobile_money' ? 'MoMo' : 'Cash'}
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
              UGX {subtotal.toLocaleString()}
            </AppText>
          </View>
          <View className="flex-row justify-between py-1">
            <AppText variant="caption" className="text-text-secondary">
              VAT (18% Statutory Tax)
            </AppText>
            <AppText variant="caption" className="text-text font-medium">
              UGX {vatAmount.toLocaleString()}
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
