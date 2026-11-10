import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Switch, View } from 'react-native';
import {
  MoonIcon,
  PlusIcon,
  PrinterIcon,
  SunIcon,
  TrashIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import type { Table } from '@horeca/api/schemas';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { printerService } from '@horeca/services/printerService';
import { usePrinterStore } from '@horeca/services/printerStore';
import { useHorecaTheme } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { FormField } from '@horeca/components/molecules/FormField';
import { BluetoothPrinterModal } from '@horeca/components/organisms/BluetoothPrinterModal';
import { HorecaAppBar } from '@horeca/components/organisms/HorecaAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { appModal } from '@horeca/components/molecules/modal/appModalStore';
import { useHorecaAuthStore } from '../../auth/store/horecaAuthStore';

interface BackOfficeScreenProps {
  onLockTerminal: () => void;
  onOrdersPress?: () => void;
  onProfilePress?: () => void;
}

export const BackOfficeScreen: React.FC<BackOfficeScreenProps> = ({
  onLockTerminal,
  onOrdersPress,
  onProfilePress,
}) => {
  const { colors, isDark, toggleTheme } = useHorecaTheme();

  const tables = useHorecaStore(state => state.tables);
  const setTables = useHorecaStore(state => state.setTables);
  const menuItems = useHorecaStore(state => state.menuItems);
  const staffList = useHorecaAuthStore(state => state.staffList);
  const savedPrinter = usePrinterStore(state => state.savedPrinter);

  const [activeTab, setActiveTab] = useState<'tables' | 'menu' | 'staff' | 'theme'>('tables');
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);

  useEffect(() => {
    usePrinterStore.getState().hydrate().catch(() => {});
  }, []);

  // New Table Modal
  const [isNewTableModalOpen, setIsNewTableModalOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [newTableSection, setNewTableSection] = useState('Main Dining');

  const handleCreateTable = () => {
    if (!newTableNumber.trim()) {
      appModal.warning('Required', 'Please enter a table number (e.g. T-08).');
      return;
    }

    const newTable: Table = {
      id: `tbl-${Date.now()}`,
      table_number: newTableNumber.trim().toUpperCase(),
      capacity: parseInt(newTableCapacity, 10) || 4,
      status: 'available',
      section: newTableSection,
    };

    setTables([...tables, newTable]);
    setIsNewTableModalOpen(false);
    setNewTableNumber('');
    appModal.success('Table Created', `Table ${newTable.table_number} added to floor plan.`);
  };

  const handleDeleteTable = (tableId: string) => {
    const tbl = tables.find(t => t.id === tableId);
    appModal.confirm({
      title: 'Remove Table',
      message: `Are you sure you want to remove Table ${tbl?.table_number ?? ''} from the floor plan?`,
      confirmText: 'Remove',
      isDestructive: true,
      onConfirm: () => {
        setTables(tables.filter(t => t.id !== tableId));
      },
    });
  };

  return (
    <ScreenTemplate
      scrollable
      withBottomInset
      className="bg-background"
      header={
        <HorecaAppBar
          title="Admin Back Office"
          subtitle="MASTER CONFIG"
          onOrdersPress={onOrdersPress}
          onLockPress={onLockTerminal}
          onProfilePress={onProfilePress}
        />
      }
      contentContainerClassName="px-4 py-5"
    >
      {/* Navigation Tabs */}
      <View className="flex-row p-1 bg-surface border border-border rounded-horeca mb-5">
        {(['tables', 'menu', 'staff', 'theme'] as const).map(tab => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              accessibilityRole="button"
              accessibilityLabel={`Tab ${tab}`}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-horeca items-center justify-center ${
                isActive ? 'bg-primary shadow-sm' : 'bg-transparent'
              }`}
            >
              <AppText
                variant="label"
                className={`font-bold text-xs uppercase ${
                  isActive ? 'text-on-primary' : 'text-text'
                }`}
              >
                {tab}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* TAB 1: TABLES */}
      {activeTab === 'tables' && (
        <View>
          <View className="flex-row items-center justify-between mb-4">
            <AppText variant="title" className="text-lg font-bold text-text">
              Floor Tables ({tables.length})
            </AppText>
            <Button
              label="Add Table"
              variant="primary"
              size="sm"
              onPress={() => setIsNewTableModalOpen(true)}
              leftIcon={<PlusIcon color={colors.onPrimary} size={16} />}
            />
          </View>

          {tables.map(table => (
            <View
              key={table.id}
              className="flex-row items-center justify-between p-3.5 mb-2.5 rounded-horeca bg-surface border border-border shadow-sm"
            >
              <View className="flex-1 mr-2">
                <AppText variant="label" className="font-bold text-text">
                  Table {table.table_number}
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-[11px]">
                  {table.section || 'General'} • Capacity: {table.capacity} Guests
                </AppText>
              </View>
              <View className="flex-row items-center">
                <Badge
                  label={table.status.toUpperCase()}
                  variant={table.status === 'occupied' ? 'occupied' : 'available'}
                  size="sm"
                  className="mr-3"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete table ${table.table_number}`}
                  onPress={() => handleDeleteTable(table.id)}
                  className="h-8 w-8 rounded-horeca bg-error/10 border border-error/20 items-center justify-center active:opacity-70"
                >
                  <TrashIcon color={colors.error} size={16} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* TAB 2: MENU */}
      {activeTab === 'menu' && (
        <View>
          <View className="flex-row items-center justify-between mb-4">
            <AppText variant="title" className="text-lg font-bold text-text">
              Catalog Items ({menuItems.length})
            </AppText>
            <Badge label="READ ONLY" variant="neutral" size="sm" />
          </View>

          {menuItems.map(item => (
            <View
              key={item.id}
              className="flex-row items-center justify-between p-3.5 mb-2.5 rounded-horeca bg-surface border border-border shadow-sm"
            >
              <View className="flex-1 mr-2">
                <AppText variant="label" className="font-bold text-text" numberOfLines={1}>
                  {item.name}
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-[11px]">
                  Station: {item.station?.toUpperCase()} • {item.age_restricted ? '18+ Restricted' : 'All Ages'}
                </AppText>
              </View>
              <AppText variant="label" className="font-bold text-primary">
                UGX {item.price.toLocaleString()}
              </AppText>
            </View>
          ))}
        </View>
      )}

      {/* TAB 3: STAFF */}
      {activeTab === 'staff' && (
        <View>
          <View className="flex-row items-center justify-between mb-4">
            <AppText variant="title" className="text-lg font-bold text-text">
              Terminal Users ({staffList.length})
            </AppText>
            <Badge label="ACTIVE PIN USERS" variant="primary" size="sm" />
          </View>

          {staffList.map(staff => (
            <View
              key={staff.id}
              className="flex-row items-center justify-between p-3.5 mb-2.5 rounded-horeca bg-surface border border-border shadow-sm"
            >
              <View className="flex-1 mr-2">
                <AppText variant="label" className="font-bold text-text">
                  {staff.name}
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-[11px]">
                  Permissions: {staff.permissions?.slice(0, 3).join(', ') || 'Standard POS'}
                </AppText>
              </View>
              <Badge
                label={staff.role.toUpperCase()}
                variant={staff.role === 'manager' || staff.role === 'admin' ? 'primary' : 'neutral'}
                size="sm"
              />
            </View>
          ))}
        </View>
      )}

      {/* TAB 4: THEME & DISPLAY */}
      {activeTab === 'theme' && (
        <View>
          <View className="rounded-horeca bg-surface border border-border p-5 shadow-sm mb-4">
            <AppText variant="title" className="text-lg font-bold text-text mb-1">
              Display & Appearance
            </AppText>
            <AppText variant="caption" className="text-text-secondary mb-4">
              Configure POS interface theme and high-contrast night mode.
            </AppText>

            <View className="flex-row items-center justify-between py-3 border-t border-border/40">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="h-10 w-10 rounded-horeca bg-background border border-border items-center justify-center mr-3">
                  {isDark ? (
                    <MoonIcon color={colors.primary} size={20} />
                  ) : (
                    <SunIcon color={colors.statusReserved} size={20} />
                  )}
                </View>
                <View className="flex-1">
                  <AppText variant="label" className="font-bold text-text">
                    Dark Mode Interface
                  </AppText>
                  <AppText variant="caption" className="text-text-secondary text-xs">
                    {isDark ? 'High-contrast dark palette active' : 'Bright daylight palette active'}
                  </AppText>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.surfaceDim, true: colors.primary }}
                thumbColor={colors.onPrimary}
              />
            </View>
          </View>

          <View className="rounded-horeca bg-surface border border-border p-5 shadow-sm">
            <View className="flex-row items-center justify-between mb-1">
              <AppText variant="title" className="text-lg font-bold text-text">
                Bluetooth Thermal Printer
              </AppText>
              <Badge
                label={savedPrinter ? `${savedPrinter.paperWidth}MM READY` : 'NOT CONFIGURED'}
                variant={savedPrinter ? 'available' : 'neutral'}
                size="sm"
              />
            </View>
            <AppText variant="caption" className="text-text-secondary mb-4">
              Configure paired ESC/POS Bluetooth thermal receipt and KOT printer.
            </AppText>

            <View className="flex-row items-center justify-between py-3 border-t border-border/40 mb-3">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="h-10 w-10 rounded-horeca bg-background border border-border items-center justify-center mr-3">
                  <PrinterIcon color={colors.primary} size={20} />
                </View>
                <View className="flex-1">
                  <AppText variant="label" className="font-bold text-text">
                    {savedPrinter ? savedPrinter.name : 'No Default Printer Selected'}
                  </AppText>
                  <AppText variant="caption" className="text-text-secondary text-xs">
                    {savedPrinter
                      ? `MAC: ${savedPrinter.address} • Roll: ${savedPrinter.paperWidth}mm`
                      : 'Tap Configure Printer to select a paired Bluetooth printer'}
                  </AppText>
                </View>
              </View>
            </View>

            <View className="flex-row">
              <View className="flex-1 mr-2">
                <Button
                  label={savedPrinter ? 'Change Printer' : 'Select Printer'}
                  variant="primary"
                  size="sm"
                  onPress={() => setIsPrinterModalOpen(true)}
                />
              </View>
              {savedPrinter ? (
                <View className="flex-1">
                  <Button
                    label="Test Print"
                    variant="secondary"
                    size="sm"
                    loading={isTestingPrinter}
                    onPress={async () => {
                      setIsTestingPrinter(true);
                      try {
                        await printerService.printTestSlip(savedPrinter.address);
                        appModal.success(
                          'Test Print Sent',
                          `Test slip printed on ${savedPrinter.name}.`,
                        );
                      } catch (err: any) {
                        appModal.error(
                          'Test Print Failed',
                          err?.message || 'Unable to print test slip.',
                        );
                      } finally {
                        setIsTestingPrinter(false);
                      }
                    }}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </View>
      )}

      <BluetoothPrinterModal
        visible={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
      />

      {/* CREATE TABLE MODAL */}
      <Modal
        visible={isNewTableModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNewTableModalOpen(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="w-full max-w-md rounded-3xl bg-surface border border-border p-6 shadow-2xl">
            <View className="flex-row items-center justify-between pb-3 mb-4 border-b border-border/50">
              <AppText variant="title" className="font-bold text-text">
                Add Floor Table
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setIsNewTableModalOpen(false)}
                className="h-8 w-8 rounded-full bg-background border border-border items-center justify-center active:opacity-70"
              >
                <XMarkIcon color={colors.onSurfaceVariant} size={16} />
              </Pressable>
            </View>

            <FormField
              label="Table Number / Code"
              placeholder="e.g. T-09 or BAR-03"
              value={newTableNumber}
              onChangeText={setNewTableNumber}
              autoCapitalize="characters"
            />

            <FormField
              label="Seating Capacity (Guests)"
              placeholder="4"
              value={newTableCapacity}
              onChangeText={setNewTableCapacity}
              keyboardType="numeric"
            />

            <FormField
              label="Floor Section"
              placeholder="Main Dining, Patio, Bar, Rooftop"
              value={newTableSection}
              onChangeText={setNewTableSection}
            />

            <Button
              label="Save Table"
              variant="primary"
              size="lg"
              onPress={handleCreateTable}
              className="mt-3"
            />
          </View>
        </View>
      </Modal>
    </ScreenTemplate>
  );
};
