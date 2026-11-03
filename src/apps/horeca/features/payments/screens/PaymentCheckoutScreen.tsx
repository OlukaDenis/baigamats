import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, TextInput, View } from 'react-native';
import {
  BanknotesIcon,
  CheckCircleIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
} from 'react-native-heroicons/outline';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { AlertBanner } from '@horeca/components/molecules/AlertBanner';
import { HorecaSubAppBar } from '@horeca/components/organisms/HorecaSubAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';

interface PaymentCheckoutScreenProps {
  onPaymentSuccess: (method: 'cash' | 'momo', amount: number) => void;
  onCancel: () => void;
  onLockTerminal: () => void;
  totalAmount?: number;
}

export const PaymentCheckoutScreen: React.FC<PaymentCheckoutScreenProps> = ({
  onPaymentSuccess,
  onCancel,
  onLockTerminal,
  totalAmount = 540_000,
}) => {
  const colors = useHorecaColors();

  const billOrderOptimistic = useHorecaStore(state => state.billOrderOptimistic);
  const activeOrderId = useHorecaStore(state => state.activeOrderId);

  // Method: 'cash' | 'momo'
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'momo'>('cash');

  // Cash state
  const [cashTendered, setCashTendered] = useState<number>(550_000);
  const [triggerDrawer, setTriggerDrawer] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // MoMo state
  const [selectedNetwork, setSelectedNetwork] = useState<'mtn' | 'airtel'>('mtn');
  const [phoneNumber, setPhoneNumber] = useState<string>('772123456');
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);

  const changeDue = Math.max(0, cashTendered - totalAmount);

  const handleCashTender = () => {
    setIsProcessing(true);
    setTimeout(() => {
      if (activeOrderId) {
        billOrderOptimistic(activeOrderId, 'cash');
      }
      setIsProcessing(false);
      onPaymentSuccess('cash', cashTendered);
    }, 600);
  };

  const handleSendMoMoPrompt = () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      Alert.alert('Phone Required', 'Please enter a valid 9-digit Ugandan mobile number.');
      return;
    }

    setIsProcessing(true);
    setPollingStatus('Sending prompt to customer device...');

    setTimeout(() => {
      setPollingStatus('Awaiting customer PIN entry on network STK...');
      setTimeout(() => {
        setIsProcessing(false);
        setPollingStatus(null);
        if (activeOrderId) {
          billOrderOptimistic(activeOrderId, 'cash');
        }
        onPaymentSuccess('momo', totalAmount);
      }, 2500);
    }, 1500);
  };

  return (
    <ScreenTemplate
      scrollable
      withBottomInset
      className="bg-background"
      header={
        <HorecaSubAppBar title="Checkout & Payment" onBack={onCancel} onOrdersPress={onCancel} />
      }
      contentContainerClassName="px-4 py-5"
    >
      {/* Settlement Summary Card */}
      <View className="rounded-3xl bg-surface border border-border p-5 mb-5 shadow-sm">
        <View className="flex-row items-center justify-between mb-2">
          <AppText variant="label" className="font-bold text-text">
            Table 04 • Main Dining
          </AppText>
          <Badge label="4 GUESTS" variant="primary" size="sm" />
        </View>

        <AppText variant="caption" className="text-text-secondary uppercase font-semibold text-[11px] mt-1">
          Total Settlement Due
        </AppText>
        <AppText variant="display" className="text-3xl font-extrabold text-primary my-1">
          UGX {totalAmount.toLocaleString()}
        </AppText>

        <View className="pt-2 border-t border-border/50">
          <AppText variant="caption" className="text-text-secondary text-xs">
            Subtotal: UGX 457,627 • VAT (18%): UGX 82,373 • Service: 0
          </AppText>
        </View>
      </View>

      {/* Payment Method Switch Tabs */}
      <View className="flex-row p-1 bg-surface border border-border rounded-2xl mb-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pay with Cash"
          onPress={() => setSelectedMethod('cash')}
          className={`flex-1 py-3 rounded-xl flex-row items-center justify-center ${
            selectedMethod === 'cash'
              ? 'bg-primary shadow-sm'
              : 'bg-transparent active:bg-background/50'
          }`}
        >
          <BanknotesIcon
            color={selectedMethod === 'cash' ? colors.onPrimary : colors.onSurfaceVariant}
            size={20}
            className="mr-2"
          />
          <AppText
            variant="label"
            className={`font-bold ${
              selectedMethod === 'cash' ? 'text-on-primary' : 'text-text'
            }`}
          >
            Cash Payment
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pay with Mobile Money"
          onPress={() => setSelectedMethod('momo')}
          className={`flex-1 py-3 rounded-xl flex-row items-center justify-center ${
            selectedMethod === 'momo'
              ? 'bg-primary shadow-sm'
              : 'bg-transparent active:bg-background/50'
          }`}
        >
          <DevicePhoneMobileIcon
            color={selectedMethod === 'momo' ? colors.onPrimary : colors.onSurfaceVariant}
            size={20}
            className="mr-2"
          />
          <AppText
            variant="label"
            className={`font-bold ${
              selectedMethod === 'momo' ? 'text-on-primary' : 'text-text'
            }`}
          >
            Mobile Money (STK)
          </AppText>
        </Pressable>
      </View>

      {/* CASH PAYMENT VIEW */}
      {selectedMethod === 'cash' ? (
        <View className="rounded-3xl bg-surface border border-border p-5 mb-5 shadow-sm">
          <AppText variant="label" className="font-bold text-text mb-3">
            Quick Tender Presets
          </AppText>

          {/* Quick Cash Presets */}
          <View className="flex-row flex-wrap justify-between mb-4">
            {[
              { label: 'Exact Total', val: totalAmount },
              { label: 'Round 550k', val: 550_000 },
              { label: 'Round 600k', val: 600_000 },
              { label: 'Round 1M', val: 1_000_000 },
            ].map(preset => {
              const isSelected = cashTendered === preset.val;
              return (
                <Pressable
                  key={preset.label}
                  accessibilityRole="button"
                  accessibilityLabel={preset.label}
                  onPress={() => setCashTendered(preset.val)}
                  className={`w-[48%] mb-2.5 p-3 rounded-2xl border ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-background border-border active:bg-surface'
                  }`}
                >
                  <AppText variant="caption" className="text-text-secondary font-medium">
                    {preset.label}
                  </AppText>
                  <AppText variant="label" className="font-bold text-primary text-base mt-0.5">
                    UGX {preset.val.toLocaleString()}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Manual Received Cash Input */}
          <View className="mb-4">
            <AppText variant="caption" className="text-text-secondary font-semibold uppercase text-[11px] mb-1.5">
              Cash Tendered (UGX)
            </AppText>
            <View className="flex-row items-center rounded-xl bg-background border border-border px-4 py-1.5">
              <AppText variant="label" className="font-bold text-primary mr-2">
                UGX
              </AppText>
              <TextInput
                value={cashTendered.toString()}
                onChangeText={txt => {
                  const parsed = parseInt(txt.replace(/\D/g, ''), 10);
                  setCashTendered(isNaN(parsed) ? 0 : parsed);
                }}
                keyboardType="numeric"
                style={{ color: colors.onSurface }}
                className="flex-1 text-lg font-bold py-1.5"
              />
            </View>
          </View>

          {/* Change Due Card */}
          <View className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex-row items-center justify-between mb-4">
            <View>
              <AppText variant="label" className="font-bold text-primary">
                Change Due Customer
              </AppText>
              <AppText variant="caption" className="text-text-secondary">
                Return cash to guest
              </AppText>
            </View>
            <AppText variant="title" className="text-xl font-extrabold text-primary">
              UGX {changeDue.toLocaleString()}
            </AppText>
          </View>

          {/* Kick Drawer Switch */}
          <View className="flex-row items-center justify-between py-2 mb-4">
            <AppText variant="label" className="text-text font-medium">
              Trigger Physical Cash Drawer Kick
            </AppText>
            <Switch
              value={triggerDrawer}
              onValueChange={setTriggerDrawer}
              trackColor={{ false: colors.surfaceDim, true: colors.primary }}
              thumbColor={colors.onPrimary}
            />
          </View>

          {/* Final Cash Tender CTA */}
          <Button
            label={`Complete Cash Sale • UGX ${totalAmount.toLocaleString()}`}
            variant="primary"
            size="lg"
            onPress={handleCashTender}
            loading={isProcessing}
          />
        </View>
      ) : (
        /* MOMO PAYMENT VIEW */
        <View className="rounded-3xl bg-surface border border-border p-5 mb-5 shadow-sm">
          <AppText variant="label" className="font-bold text-text mb-3">
            Choose Telecom Provider
          </AppText>

          {/* Telecom Network Selector */}
          <View className="flex-row justify-between mb-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="MTN Mobile Money"
              onPress={() => setSelectedNetwork('mtn')}
              className={`w-[48%] p-3.5 rounded-2xl border flex-row items-center ${
                selectedNetwork === 'mtn'
                  ? 'bg-yellow-500/15 border-yellow-500 shadow-sm'
                  : 'bg-background border-border active:bg-surface'
              }`}
            >
              <View className="h-9 w-9 rounded-xl bg-yellow-500 items-center justify-center mr-2.5">
                <AppText className="text-xs font-black text-black">MTN</AppText>
              </View>
              <View className="flex-1">
                <AppText variant="label" className="font-bold text-text text-sm">
                  MTN MoMo
                </AppText>
                <AppText variant="caption" className="text-[10px] text-text-secondary">
                  Direct STK Push
                </AppText>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Airtel Money"
              onPress={() => setSelectedNetwork('airtel')}
              className={`w-[48%] p-3.5 rounded-2xl border flex-row items-center ${
                selectedNetwork === 'airtel'
                  ? 'bg-red-500/15 border-red-500 shadow-sm'
                  : 'bg-background border-border active:bg-surface'
              }`}
            >
              <View className="h-9 w-9 rounded-xl bg-red-600 items-center justify-center mr-2.5">
                <AppText className="text-xs font-black text-white">airtel</AppText>
              </View>
              <View className="flex-1">
                <AppText variant="label" className="font-bold text-text text-sm">
                  Airtel Money
                </AppText>
                <AppText variant="caption" className="text-[10px] text-text-secondary">
                  Direct Prompt
                </AppText>
              </View>
            </Pressable>
          </View>

          {/* Customer Phone */}
          <View className="mb-4">
            <AppText variant="caption" className="text-text-secondary font-semibold uppercase text-[11px] mb-1.5">
              Customer Mobile Phone
            </AppText>
            <View className="flex-row items-center rounded-xl bg-background border border-border px-3.5 py-1.5">
              <View className="flex-row items-center mr-2 pr-2 border-r border-border">
                <AppText className="text-sm mr-1">🇺🇬</AppText>
                <AppText variant="label" className="font-bold text-text">
                  +256
                </AppText>
              </View>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholder="772 123 456"
                placeholderTextColor={colors.onSurfaceVariant}
                style={{ color: colors.onSurface }}
                className="flex-1 text-base font-medium py-1.5"
              />
            </View>
          </View>

          {/* Polling Banner */}
          {pollingStatus ? (
            <View className="p-3.5 mb-4 rounded-xl bg-primary/10 border border-primary/20 flex-row items-center">
              <ActivityIndicator color={colors.primary} size="small" className="mr-3" />
              <AppText variant="caption" className="text-primary font-medium flex-1">
                {pollingStatus}
              </AppText>
            </View>
          ) : (
            <AlertBanner
              severity="info"
              message="Push prompt will be sent directly to customer's phone for PIN authorization. Terminal confirms automatically."
              className="mb-4"
            />
          )}

          {/* Send MoMo CTA */}
          <Button
            label={`Initiate ${selectedNetwork.toUpperCase()} STK • UGX ${totalAmount.toLocaleString()}`}
            variant="primary"
            size="lg"
            onPress={handleSendMoMoPrompt}
            loading={isProcessing}
          />
        </View>
      )}
    </ScreenTemplate>
  );
};
