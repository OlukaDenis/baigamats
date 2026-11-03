import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import {
  ArrowDownLeftIcon,
  BellSlashIcon,
  CheckIcon,
  MegaphoneIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from 'react-native-heroicons/outline';

import { AppText } from '@sacco/components/atoms/AppText';
import { Button } from '@sacco/components/atoms/Button';
import { AppBar } from '@sacco/components/organisms/AppBar';
import { ScreenTemplate } from '@sacco/components/templates/ScreenTemplate';
import { useTheme } from '@sacco/theme/ThemeProvider';
import type { AppNotification, NotificationType } from '../types/notificationTypes';

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Deposit Credited',
    message: 'UGX 100,000 received via MTN Mobile Money has been credited to your savings balance.',
    timestamp: '10 mins ago',
    type: 'transaction',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Loan Installment Due',
    message: 'Your monthly installment of UGX 160,000 is due in 3 days. Repay anytime directly from your savings.',
    timestamp: '2 hours ago',
    type: 'loan',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Security Alert',
    message: 'A successful login was registered from your active Android mobile device.',
    timestamp: 'Yesterday',
    type: 'security',
    read: true,
  },
  {
    id: 'notif-4',
    title: 'Dividend Payout Notice',
    message: 'Annual share dividend of UGX 12,500 has been credited to your savings account.',
    timestamp: '3 days ago',
    type: 'announcement',
    read: true,
  },
];

export function NotificationsScreen() {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: !n.read } : n)),
    );
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case 'transaction':
        return <ArrowDownLeftIcon color={colors.primary} size={20} />;
      case 'loan':
        return <ScaleIcon color={colors.secondary} size={20} />;
      case 'security':
        return <ShieldCheckIcon color="#059669" size={20} />;
      case 'announcement':
      default:
        return <MegaphoneIcon color="#4f46e5" size={20} />;
    }
  };

  return (
    <ScreenTemplate
      scrollable={false}
      header={
        <AppBar
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          showBackButton={true}
          rightAction={
            unreadCount > 0 ? (
              <Pressable
                onPress={handleMarkAllRead}
                accessibilityRole="button"
                accessibilityLabel="Mark all as read"
                className="flex-row items-center gap-1 rounded-lg bg-secondary/10 px-2.5 py-1.5 active:opacity-70"
              >
                <CheckIcon color={colors.secondary} size={14} />
                <AppText className="text-xs font-semibold text-secondary">
                  Mark all read
                </AppText>
              </Pressable>
            ) : null
          }
        />
      }
    >
      {/* Filter Tabs */}
      <View className="mb-4 flex-row rounded-xl bg-border/40 p-1">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === 'all' }}
          onPress={() => setFilter('all')}
          className={`flex-1 items-center justify-center rounded-lg py-2 ${
            filter === 'all' ? 'bg-surface shadow-xs' : ''
          }`}
        >
          <AppText
            className={`text-xs font-semibold ${
              filter === 'all' ? 'text-text-primary' : 'text-text-secondary'
            }`}
          >
            All ({notifications.length})
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === 'unread' }}
          onPress={() => setFilter('unread')}
          className={`flex-1 items-center justify-center rounded-lg py-2 ${
            filter === 'unread' ? 'bg-surface shadow-xs' : ''
          }`}
        >
          <AppText
            className={`text-xs font-semibold ${
              filter === 'unread' ? 'text-text-primary' : 'text-text-secondary'
            }`}
          >
            Unread ({unreadCount})
          </AppText>
        </Pressable>
      </View>

      {/* Notifications List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center rounded-3xl border border-dashed border-border bg-surface p-10 mt-6">
            <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-secondary/15">
              <BellSlashIcon color={colors.secondary} size={28} />
            </View>
            <AppText variant="title" className="font-bold text-text-primary">
              No notifications
            </AppText>
            <AppText className="mt-1 text-center text-xs text-text-secondary">
              {filter === 'unread'
                ? 'You have read all notifications.'
                : 'You have no notifications yet.'}
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleToggleRead(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.message}. ${item.timestamp}`}
            className={`mb-3 rounded-2xl border p-4 shadow-xs transition-colors ${
              item.read
                ? 'border-border bg-surface opacity-80'
                : 'border-secondary/30 bg-surface'
            }`}
          >
            <View className="flex-row items-start gap-3">
              <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-xl bg-border/40">
                {renderIcon(item.type)}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <AppText className="font-bold text-text-primary">
                    {item.title}
                  </AppText>
                  {!item.read ? (
                    <View className="h-2 w-2 rounded-full bg-secondary" />
                  ) : null}
                </View>
                <AppText className="mt-1 text-xs text-text-secondary leading-relaxed">
                  {item.message}
                </AppText>
                <AppText className="mt-2 text-[10px] text-text-secondary font-medium">
                  {item.timestamp}
                </AppText>
              </View>
            </View>
          </Pressable>
        )}
      />
    </ScreenTemplate>
  );
}

