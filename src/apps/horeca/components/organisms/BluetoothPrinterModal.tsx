import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  PrinterIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { AlertBanner } from '@horeca/components/molecules/AlertBanner';
import { appModal } from '@horeca/components/molecules/modal/appModalStore';
import { printerService } from '@horeca/services/printerService';
import {
  type BluetoothPrinterDevice,
  usePrinterStore,
} from '@horeca/services/printerStore';
import { useHorecaColors } from '@horeca/theme/colors';
import { activityCaptureProps } from '@horeca/features/auth/utils/inactivityTracker';

interface BluetoothPrinterModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Optional callback fired immediately after the user selects and connects to a printer
   * (e.g., to automatically resume printing the current receipt).
   */
  onPrinterReady?: (printerAddress: string) => void;
}

export const BluetoothPrinterModal: React.FC<BluetoothPrinterModalProps> = ({
  visible,
  onClose,
  onPrinterReady,
}) => {
  const colors = useHorecaColors();
  const savedPrinter = usePrinterStore(state => state.savedPrinter);
  const pairedDevices = usePrinterStore(state => state.pairedDevices);
  const updatePreferences = usePrinterStore(state => state.updatePreferences);

  const [isScanning, setIsScanning] = useState(false);
  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPairedDevices = useCallback(async () => {
    setIsScanning(true);
    setErrorMessage(null);
    try {
      await usePrinterStore.getState().hydrate();
      await printerService.getPairedPrinters();
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Unable to load paired Bluetooth devices. Check Bluetooth settings.',
      );
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadPairedDevices();
    }
  }, [visible, loadPairedDevices]);

  const handleSelectDevice = async (device: BluetoothPrinterDevice) => {
    setConnectingAddress(device.address);
    setErrorMessage(null);
    try {
      await printerService.connectPrinter({
        address: device.address,
        name: device.name,
        paperWidth: savedPrinter?.paperWidth ?? 58,
      });

      if (onPrinterReady) {
        onClose();
        onPrinterReady(device.address);
      } else {
        appModal.success(
          'Printer Connected',
          `${device.name} (${device.address}) is now connected and ready to print.`,
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          `Could not connect to ${device.name}. Ensure the printer is switched on and within range.`,
      );
    } finally {
      setConnectingAddress(null);
    }
  };

  const handleTestPrint = async () => {
    if (!savedPrinter?.address) return;
    setIsTesting(true);
    setErrorMessage(null);
    try {
      await printerService.printTestSlip(savedPrinter.address);
      appModal.success('Test Slip Printed', `Sent test slip to ${savedPrinter.name}.`);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Test print failed. Verify the printer is turned on and has paper.',
      );
    } finally {
      setIsTesting(false);
    }
  };

  const paperWidth = savedPrinter?.paperWidth ?? 58;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View {...activityCaptureProps} className="flex-1 bg-black/60 items-center justify-center p-4">
        <View className="w-full max-w-md rounded-3xl bg-surface border border-border p-5 shadow-2xl max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-border/50">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="h-9 w-9 rounded-horeca bg-primary/10 border border-primary/20 items-center justify-center mr-2.5">
                <PrinterIcon color={colors.primary} size={18} />
              </View>
              <View className="flex-1">
                <AppText variant="title" className="font-bold text-text text-base">
                  Bluetooth Thermal Printer
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-[11px]">
                  Select a paired ESC/POS printer
                </AppText>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close printer setup"
              onPress={onClose}
              className="h-8 w-8 rounded-full bg-background border border-border items-center justify-center active:opacity-70"
            >
              <XMarkIcon color={colors.onSurfaceVariant} size={16} />
            </Pressable>
          </View>

          {errorMessage ? (
            <AlertBanner severity="error" message={errorMessage} className="mb-3" />
          ) : null}

          {/* Paper Width Selector */}
          <View className="flex-row items-center justify-between bg-background border border-border rounded-horeca p-2.5 mb-3">
            <AppText variant="caption" className="text-text-secondary font-semibold ml-1">
              Paper Roll Width
            </AppText>
            <View className="flex-row">
              {([58, 80] as const).map(width => {
                const selected = paperWidth === width;
                return (
                  <Pressable
                    key={width}
                    accessibilityRole="button"
                    accessibilityLabel={`${width}mm paper width`}
                    onPress={() => {
                      if (savedPrinter) {
                        updatePreferences({ paperWidth: width });
                      } else {
                        usePrinterStore.setState(state => ({
                          savedPrinter: state.savedPrinter
                            ? { ...state.savedPrinter, paperWidth: width }
                            : null,
                        }));
                      }
                    }}
                    style={{
                      backgroundColor: selected ? colors.primary : 'transparent',
                    }}
                    className="px-3 py-1.5 rounded-horeca ml-1"
                  >
                    <AppText
                      variant="caption"
                      style={{ color: selected ? colors.onPrimary : colors.onSurface }}
                      className="font-bold text-xs"
                    >
                      {width}mm
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Paired Devices List Header */}
          <View className="flex-row items-center justify-between mb-2">
            <AppText variant="caption" className="text-text-secondary uppercase font-semibold text-[11px]">
              Paired Bluetooth Devices ({pairedDevices.length})
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh paired printers"
              onPress={loadPairedDevices}
              disabled={isScanning}
              className="flex-row items-center py-1 px-2 rounded-horeca active:opacity-70"
            >
              <ArrowPathIcon color={colors.primary} size={14} />
              <AppText variant="caption" className="text-primary font-bold text-xs ml-1">
                {isScanning ? 'Scanning...' : 'Refresh'}
              </AppText>
            </Pressable>
          </View>

          {/* Devices Scroll List */}
          <ScrollView className="max-h-64 mb-3">
            {isScanning && pairedDevices.length === 0 ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText variant="caption" className="text-text-secondary mt-2">
                  Checking paired Bluetooth devices...
                </AppText>
              </View>
            ) : pairedDevices.length === 0 ? (
              <View className="p-4 rounded-horeca bg-background border border-border items-center">
                <AppText variant="label" className="font-bold text-text text-center mb-1">
                  No Paired Bluetooth Devices Found
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-center text-xs">
                  Pair your thermal printer in Android Bluetooth Settings first (default PIN is usually 0000 or 1234), then tap Refresh.
                </AppText>
              </View>
            ) : (
              pairedDevices.map(device => {
                const isSelected =
                  savedPrinter?.address.toUpperCase() === device.address.toUpperCase();
                const isConnectingThis = connectingAddress === device.address;

                return (
                  <Pressable
                    key={device.address}
                    accessibilityRole="button"
                    accessibilityLabel={`Connect to ${device.name}`}
                    disabled={Boolean(connectingAddress)}
                    onPress={() => handleSelectDevice(device)}
                    className={`flex-row items-center justify-between p-3.5 mb-2 rounded-horeca border ${
                      isSelected
                        ? 'bg-primary/10 border-primary'
                        : 'bg-background border-border'
                    }`}
                  >
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center">
                        <AppText variant="label" className="font-bold text-text mr-2">
                          {device.name}
                        </AppText>
                        {device.isPrinterCandidate ? (
                          <Badge label="PRINTER" variant="primary" size="sm" />
                        ) : null}
                      </View>
                      <AppText variant="caption" className="text-text-secondary text-[11px] mt-0.5">
                        MAC: {device.address}
                      </AppText>
                    </View>

                    {isConnectingThis ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : isSelected ? (
                      <View className="flex-row items-center">
                        <CheckCircleIcon color={colors.statusAvailable} size={18} />
                        <AppText
                          variant="caption"
                          className="text-status-available font-bold text-xs ml-1"
                        >
                          Active
                        </AppText>
                      </View>
                    ) : (
                      <AppText variant="caption" className="text-primary font-bold text-xs">
                        Connect
                      </AppText>
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View className="flex-row">
            {savedPrinter ? (
              <View className="flex-1 mr-2">
                <Button
                  label="Test Print"
                  variant="secondary"
                  onPress={handleTestPrint}
                  loading={isTesting}
                  disabled={Boolean(connectingAddress)}
                />
              </View>
            ) : null}
            <View className="flex-1">
              <Button
                label="Close"
                variant="primary"
                onPress={onClose}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
