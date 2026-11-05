import React, { useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FireIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { KitchenTicket, KotStatus } from '@horeca/api/schemas';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { HorecaAppBar } from '@horeca/components/organisms/HorecaAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { useKitchenTickets } from '../hooks/useKitchenTickets';

interface KitchenDisplayScreenProps {
  onLockTerminal: () => void;
  onOrdersPress?: () => void;
  onProfilePress?: () => void;
}

export const KitchenDisplayScreen: React.FC<KitchenDisplayScreenProps> = ({
  onLockTerminal,
  onOrdersPress,
  onProfilePress,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();

  const isOnline = useHorecaStore(state => state.isOnline);
  const [selectedStation, setSelectedStation] = useState<'all' | 'kitchen' | 'bar'>('all');

  const { tickets, updateStatus } = useKitchenTickets(selectedStation);

  const handleUpdateStatus = (ticket: KitchenTicket, nextStatus: KotStatus) => {
    updateStatus(ticket.order.id, ticket.id, nextStatus);
    if (nextStatus === 'ready') {
      Alert.alert('Ready Alert', `Item "${ticket.item_name}" marked READY. Waiter notified.`);
    }
  };

  const renderTicketCard = ({ item }: { item: KitchenTicket }) => {
    const isNew = item.kot_status === 'new';
    const isPreparing = item.kot_status === 'preparing';
    const isReady = item.kot_status === 'ready';

    const statusBadgeVariant =
      item.kot_status === 'new'
        ? 'info'
        : item.kot_status === 'preparing'
          ? 'warning'
          : item.kot_status === 'ready'
            ? 'success'
            : 'neutral';

    return (
      <View className="mb-3.5 rounded-2xl bg-surface border border-border p-4 shadow-sm">
        {/* Ticket Header */}
        <View className="flex-row items-center justify-between pb-3 border-b border-border/50">
          <View className="flex-row items-center">
            <View className="px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 mr-2.5">
              <AppText variant="caption" className="font-bold text-primary">
                Table {item.order.table_id?.replace(/\D/g, '') || '04'}
              </AppText>
            </View>
            <AppText variant="caption" className="font-bold text-text-secondary">
              {item.order.order_number}
            </AppText>
          </View>

          <View className="flex-row items-center">
            <View className="flex-row items-center mr-2 px-2 py-0.5 rounded-md bg-background border border-border">
              <ClockIcon color={colors.onSurfaceVariant} size={12} />
              <AppText variant="caption" className="ml-1 text-[10px] text-text-secondary font-medium">
                8m elapsed
              </AppText>
            </View>
            <Badge
              label={item.kot_status.toUpperCase()}
              variant={statusBadgeVariant}
              size="sm"
            />
          </View>
        </View>

        {/* Item Details */}
        <View className="py-3">
          <AppText variant="title" className="text-lg font-bold text-text">
            {item.qty}x {item.item_name}
          </AppText>

          {item.modifiers && item.modifiers.length > 0 ? (
            <View className="flex-row flex-wrap mt-2">
              {item.modifiers.map((mod, idx) => (
                <View
                  key={idx}
                  className="mr-1.5 mb-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20"
                >
                  <AppText variant="caption" className="text-xs font-semibold text-primary">
                    {mod}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}

          {item.notes ? (
            <View className="mt-2 flex-row items-start p-2.5 rounded-xl bg-status-reserved/10 border border-status-reserved/20">
              <ExclamationTriangleIcon color={colors.statusReserved} size={16} className="mr-1.5 mt-0.5" />
              <AppText variant="caption" className="flex-1 text-xs text-status-reserved font-medium">
                Note: {item.notes}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Status Transition Action Button */}
        <View className="pt-2 border-t border-border/40">
          {isNew ? (
            <Button
              label="Start Preparing"
              variant="secondary"
              size="sm"
              onPress={() => handleUpdateStatus(item, 'preparing')}
              leftIcon={<FireIcon color={colors.statusReserved} size={16} />}
            />
          ) : isPreparing ? (
            <Button
              label="Mark as Ready"
              variant="success"
              size="sm"
              onPress={() => handleUpdateStatus(item, 'ready')}
              leftIcon={<CheckCircleIcon color={colors.onPrimary} size={16} />}
            />
          ) : isReady ? (
            <Button
              label="Mark as Served"
              variant="outline"
              size="sm"
              onPress={() => handleUpdateStatus(item, 'served')}
            />
          ) : (
            <AppText variant="caption" className="text-center text-text-secondary py-1 font-medium">
              Item Served to Table
            </AppText>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenTemplate
      className="bg-background"
      header={
        <HorecaAppBar
          title="Kitchen Display (KDS)"
          subtitle={`KDS • ${tickets.length} ACTIVE TICKETS`}
          isOnline={isOnline}
          onOrdersPress={onOrdersPress}
          onLockPress={onLockTerminal}
          onProfilePress={onProfilePress}
        />
      }
      contentContainerClassName="flex-1"
    >
      {/* Station Selector Bar */}
      <View className="flex-row px-4 py-2.5 border-b border-border/40">
        {[
          { id: 'all', label: 'All Orders' },
          { id: 'kitchen', label: 'Kitchen (Food)' },
          { id: 'bar', label: 'Bar (Drinks)' },
        ].map(station => {
          const isActive = selectedStation === station.id;
          return (
            <Pressable
              key={station.id}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${station.label}`}
              onPress={() => setSelectedStation(station.id as any)}
              className={`mr-2 px-3.5 py-1.5 rounded-xl border ${
                isActive
                  ? 'bg-primary border-primary shadow-sm'
                  : 'bg-surface border-border active:bg-surface/80'
              }`}
            >
              <AppText
                variant="label"
                className={`text-xs font-semibold ${
                  isActive ? 'text-on-primary' : 'text-text'
                }`}
              >
                {station.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* Tickets List */}
      <FlatList
        data={tickets}
        keyExtractor={item => item.id}
        renderItem={renderTicketCard}
        contentContainerStyle={{
          padding: 14,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="py-16 items-center justify-center">
            <AppText variant="title" className="text-text font-bold mb-1">
              All Orders Clear!
            </AppText>
            <AppText variant="caption" className="text-text-secondary">
              No pending orders for {selectedStation === 'all' ? 'any station' : selectedStation}.
            </AppText>
          </View>
        }
      />
    </ScreenTemplate>
  );
};
