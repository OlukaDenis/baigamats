import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import {
  CheckCircleIcon,
  DocumentCheckIcon,
  PrinterIcon,
  QrCodeIcon,
  ShareIcon,
} from 'react-native-heroicons/outline';
import { useQueryClient } from '@tanstack/react-query';
import { horecaApi } from '@horeca/api/horecaApiClient';
import type { Receipt } from '@horeca/api/schemas';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { refreshOpenOrdersInBackground } from '@horeca/features/orders/hooks/useOpenOrders';
import { mockReceipt } from '@horeca/mock/horecaMockData';
import { printerService } from '@horeca/services/printerService';
import { usePrinterStore } from '@horeca/services/printerStore';
import { useHorecaColors } from '@horeca/theme/colors';
import {
  calculateVatBreakdown,
  resolveBusinessName,
  resolvePrintableTin,
  resolveRealFiscalNumber,
} from '@horeca/utils/vat';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { BluetoothPrinterModal } from '@horeca/components/organisms/BluetoothPrinterModal';
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
  const queryClient = useQueryClient();
  const orders = useHorecaStore(state => state.orders);
  const tables = useHorecaStore(state => state.tables);
  const activeTableId = useHorecaStore(state => state.activeTableId);
  const businessProfile = useHorecaStore(state => state.businessProfile);

  const [fetchedReceipt, setFetchedReceipt] = useState<Receipt | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const savedPrinter = usePrinterStore(state => state.savedPrinter);

  useEffect(() => {
    usePrinterStore.getState().hydrate().catch(() => {});
    refreshOpenOrdersInBackground(queryClient).catch(() => {});
  }, [queryClient]);

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
    const businessDisplayName = resolveBusinessName(businessProfile, fetchedReceipt?.business || mockReceipt.business);
    const resolvedFdn = resolveRealFiscalNumber({
      fdn: saleInfo?.fdn ?? fetchedReceipt?.fdn,
      efrisInvoiceNumber: fetchedReceipt?.efrisInvoiceNumber,
      efrisNumber: fetchedReceipt?.efrisNumber,
      fiscalNumber: fetchedReceipt?.fiscalNumber,
    });

    if (fetchedReceipt) {
      return {
        ...mockReceipt,
        ...fetchedReceipt,
        business: businessDisplayName,
        orderNumber: saleInfo?.saleNumber || fetchedReceipt.orderNumber,
        fdn: resolvedFdn,
        efrisInvoiceNumber: resolvedFdn,
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
        business: businessDisplayName,
        orderNumber: saleInfo?.saleNumber || settledOrder.order_number,
        table: settledTable ? `T${settledTable.table_number}` : mockReceipt.table,
        lines,
        itemsTotal,
        total,
        fdn: resolvedFdn,
        efrisInvoiceNumber: resolvedFdn,
      };
    }

    return {
      ...mockReceipt,
      business: businessDisplayName,
      orderNumber: saleInfo?.saleNumber || mockReceipt.orderNumber,
      total: saleInfo?.amount || mockReceipt.total,
      fdn: resolvedFdn,
      efrisInvoiceNumber: resolvedFdn,
    };
  }, [businessProfile, fetchedReceipt, saleInfo, settledOrder, settledTable]);

  const vatBreakdown = useMemo(
    () => calculateVatBreakdown(receipt.total, businessProfile?.vat),
    [receipt.total, businessProfile?.vat],
  );

  const printableTin = useMemo(
    () => resolvePrintableTin(businessProfile),
    [businessProfile],
  );

  const realFiscalNumber = useMemo(
    () => resolveRealFiscalNumber(receipt),
    [receipt],
  );

  const addressLine = businessProfile?.address?.trim() || null;
  const phoneLine = businessProfile?.phone?.trim() ? `Tel: ${businessProfile.phone.trim()}` : null;
  const emailLine = businessProfile?.email?.trim() || null;
  const contactSummary = [addressLine, phoneLine, emailLine].filter(Boolean).join(' • ');
  const headerNote = businessProfile?.receipt?.header_note?.trim() || null;
  const footerNote = businessProfile?.receipt?.footer?.trim() || null;
  const showLogo = Boolean(businessProfile?.logo_url && !logoError);

  const executePrint = useCallback(
    async (overrideAddress?: string) => {
      setIsPrinting(true);
      try {
        await printerService.printReceipt(receipt, {
          address: overrideAddress,
          businessProfile,
        });
        const activeName =
          usePrinterStore.getState().savedPrinter?.name || 'Bluetooth Printer';
        appModal.success(
          'Receipt Printed',
          `Thermal receipt sent to ${activeName}.`,
        );
      } catch (err: any) {
        if (err?.code === 'NO_PRINTER_SELECTED' || err?.message === 'NO_PRINTER_SELECTED') {
          setIsPrinterModalOpen(true);
          return;
        }
        appModal.confirm({
          title: 'Printer Connection Issue',
          message:
            err?.message ||
            'Could not print to the Bluetooth thermal printer. Would you like to select or reconnect your printer?',
          confirmText: 'Select Printer',
          cancelText: 'Cancel',
          onConfirm: () => {
            setIsPrinterModalOpen(true);
          },
        });
      } finally {
        setIsPrinting(false);
      }
    },
    [businessProfile, receipt],
  );

  const handlePrint = () => {
    executePrint();
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
      <View className="rounded-horeca bg-surface border border-border p-6 shadow-md mb-6">
        {/* Header Branding */}
        <View className="items-center pb-4 border-b border-border/50">
          {showLogo ? (
            <Image
              source={{ uri: businessProfile!.logo_url! }}
              onError={() => setLogoError(true)}
              className="h-14 w-14 rounded-horeca bg-primary/10 border border-primary/20 mb-2"
              resizeMode="contain"
            />
          ) : (
            <View className="h-12 w-12 rounded-horeca bg-primary/10 border border-primary/20 items-center justify-center mb-2">
              <DocumentCheckIcon color={colors.primary} size={24} />
            </View>
          )}
          <AppText variant="title" className="text-xl font-extrabold text-text text-center">
            {receipt.business}
          </AppText>
          {contactSummary ? (
            <AppText variant="caption" className="text-text-secondary text-center mt-0.5">
              {contactSummary}
            </AppText>
          ) : null}
          {printableTin ? (
            <AppText variant="caption" className="text-text-secondary text-center text-[11px] mt-0.5">
              TIN: {printableTin}
            </AppText>
          ) : null}
          {headerNote ? (
            <AppText variant="caption" className="text-text-secondary text-center text-xs italic mt-1">
              {headerNote}
            </AppText>
          ) : null}

          {/* Paid Stamp Badge */}
          <View className="mt-3 px-3.5 py-1.5 rounded-horeca bg-status-available/15 border border-status-available/30 flex-row items-center">
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
          {vatBreakdown.enabled ? (
            <>
              <View className="flex-row justify-between py-1">
                <AppText variant="caption" className="text-text-secondary">
                  Subtotal (Net)
                </AppText>
                <AppText variant="caption" className="text-text font-medium">
                  UGX {vatBreakdown.netAmount.toLocaleString()}
                </AppText>
              </View>
              <View className="flex-row justify-between py-1">
                <AppText variant="caption" className="text-text-secondary">
                  {vatBreakdown.label} ({vatBreakdown.ratePct}%{' '}
                  {vatBreakdown.inclusive ? 'Inclusive' : 'Exclusive'})
                </AppText>
                <AppText variant="caption" className="text-text font-medium">
                  UGX {vatBreakdown.vatAmount.toLocaleString()}
                </AppText>
              </View>
            </>
          ) : null}
          <View
            className={`flex-row justify-between items-center ${
              vatBreakdown.enabled ? 'pt-2 mt-1 border-t border-border/30' : ''
            }`}
          >
            <AppText variant="title" className="text-lg font-bold text-text">
              GRAND TOTAL
            </AppText>
            <AppText variant="title" className="text-xl font-extrabold text-primary">
              UGX {vatBreakdown.grandTotal.toLocaleString()}
            </AppText>
          </View>
        </View>

        {/* Fiscal Compliance & Receipt Footer */}
        {realFiscalNumber || footerNote ? (
          <View className="items-center pt-4">
            {realFiscalNumber ? (
              <>
                <View className="h-10 w-10 rounded-horeca bg-background border border-border items-center justify-center mb-1.5">
                  <QrCodeIcon color={colors.onSurfaceVariant} size={22} />
                </View>
                <AppText variant="caption" className="text-text-secondary font-mono text-[10px]">
                  EFRIS FDN: {realFiscalNumber}
                </AppText>
              </>
            ) : null}
            {footerNote ? (
              <AppText variant="caption" className="text-text-secondary text-xs text-center mt-1">
                {footerNote}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Action Buttons */}
      <View className="space-y-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Configure Bluetooth Printer"
          onPress={() => setIsPrinterModalOpen(true)}
          className="flex-row items-center justify-between px-4 py-2.5 mb-2 rounded-horeca bg-surface border border-border active:opacity-80"
        >
          <View className="flex-row items-center flex-1 mr-2">
            <PrinterIcon color={colors.primary} size={16} />
            <AppText variant="caption" className="text-text font-semibold ml-2" numberOfLines={1}>
              {savedPrinter
                ? `Printer: ${savedPrinter.name} (${savedPrinter.paperWidth}mm)`
                : 'No default Bluetooth printer selected'}
            </AppText>
          </View>
          <AppText variant="caption" className="text-primary font-bold text-xs">
            {savedPrinter ? 'Change' : 'Select Printer'}
          </AppText>
        </Pressable>

        <View className="flex-row mb-3">
          <View className="flex-1 mr-2">
            <Button
              label={isPrinting ? 'Printing...' : 'Print Receipt'}
              variant="secondary"
              onPress={handlePrint}
              loading={isPrinting}
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

      <BluetoothPrinterModal
        visible={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
        onPrinterReady={address => {
          executePrint(address);
        }}
      />
    </ScreenTemplate>
  );
};
