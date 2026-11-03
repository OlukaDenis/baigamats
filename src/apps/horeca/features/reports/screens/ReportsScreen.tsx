import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon,
  UsersIcon,
} from 'react-native-heroicons/outline';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { HorecaAppBar } from '@horeca/components/organisms/HorecaAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';

interface ReportsScreenProps {
  onLockTerminal: () => void;
  onOrdersPress?: () => void;
  onProfilePress?: () => void;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  onLockTerminal,
  onOrdersPress,
  onProfilePress,
}) => {
  const colors = useHorecaColors();
  const [activeTab, setActiveTab] = useState<'daily' | 'range'>('daily');

  return (
    <ScreenTemplate
      scrollable
      withBottomInset
      className="bg-background"
      header={
        <HorecaAppBar
          title="Reports & Analytics"
          subtitle="EXECUTIVE DASHBOARD"
          onOrdersPress={onOrdersPress}
          onLockPress={onLockTerminal}
          onProfilePress={onProfilePress}
        />
      }
      contentContainerClassName="px-4 py-5"
    >
      {/* Segmented Control */}
      <View className="flex-row p-1 bg-surface border border-border rounded-2xl mb-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Today's Sales"
          onPress={() => setActiveTab('daily')}
          className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
            activeTab === 'daily' ? 'bg-primary shadow-sm' : 'bg-transparent'
          }`}
        >
          <AppText
            variant="label"
            className={`font-bold ${
              activeTab === 'daily' ? 'text-on-primary' : 'text-text'
            }`}
          >
            Today's Sales
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Date Range Summary"
          onPress={() => setActiveTab('range')}
          className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
            activeTab === 'range' ? 'bg-primary shadow-sm' : 'bg-transparent'
          }`}
        >
          <AppText
            variant="label"
            className={`font-bold ${
              activeTab === 'range' ? 'text-on-primary' : 'text-text'
            }`}
          >
            Date Range Summary
          </AppText>
        </Pressable>
      </View>

      {/* KPI Cards 2x2 Grid */}
      <View className="flex-row flex-wrap justify-between mb-5">
        <View className="w-[48%] mb-3 p-4 rounded-2xl bg-surface border border-border shadow-sm">
          <View className="flex-row items-center justify-between mb-1.5">
            <AppText variant="caption" className="text-text-secondary text-[10px] font-bold uppercase">
              Total Revenue
            </AppText>
            <ArrowTrendingUpIcon color={colors.statusAvailable} size={16} />
          </View>
          <AppText variant="title" className="text-xl font-extrabold text-primary">
            UGX 1.42M
          </AppText>
          <AppText variant="caption" className="text-status-available text-[11px] font-semibold mt-1">
            +18.4% vs yesterday
          </AppText>
        </View>

        <View className="w-[48%] mb-3 p-4 rounded-2xl bg-surface border border-border shadow-sm">
          <View className="flex-row items-center justify-between mb-1.5">
            <AppText variant="caption" className="text-text-secondary text-[10px] font-bold uppercase">
              Checks / Covers
            </AppText>
            <UsersIcon color={colors.primary} size={16} />
          </View>
          <AppText variant="title" className="text-xl font-extrabold text-text">
            28 Checks
          </AppText>
          <AppText variant="caption" className="text-text-secondary text-[11px] mt-1">
            64 Total Guests
          </AppText>
        </View>

        <View className="w-[48%] mb-3 p-4 rounded-2xl bg-surface border border-border shadow-sm">
          <View className="flex-row items-center justify-between mb-1.5">
            <AppText variant="caption" className="text-text-secondary text-[10px] font-bold uppercase">
              Avg Check Size
            </AppText>
            <ChartBarIcon color={colors.primary} size={16} />
          </View>
          <AppText variant="title" className="text-xl font-extrabold text-text">
            UGX 50,714
          </AppText>
          <AppText variant="caption" className="text-text-secondary text-[11px] mt-1">
            Target: 45,000 UGX
          </AppText>
        </View>

        <View className="w-[48%] mb-3 p-4 rounded-2xl bg-surface border border-border shadow-sm">
          <View className="flex-row items-center justify-between mb-1.5">
            <AppText variant="caption" className="text-text-secondary text-[10px] font-bold uppercase">
              Avg Turn Time
            </AppText>
            <ClockIcon color={colors.onSurfaceVariant} size={16} />
          </View>
          <AppText variant="title" className="text-xl font-extrabold text-text">
            42 min
          </AppText>
          <AppText variant="caption" className="text-status-available text-[11px] font-semibold mt-1">
            Optimal: &lt; 50 min
          </AppText>
        </View>
      </View>

      {/* Category Revenue Breakdown */}
      <View className="rounded-3xl bg-surface border border-border p-5 mb-5 shadow-sm">
        <AppText variant="title" className="text-lg font-bold text-text mb-3">
          Sales by Department
        </AppText>

        {[
          { cat: 'Kitchen / Food', amount: 840_000, percent: 59, colorClass: 'bg-primary' },
          { cat: 'Bar / Alcoholic', amount: 460_000, percent: 32, colorClass: 'bg-status-reserved' },
          { cat: 'Non-Alcoholic Beverages', amount: 120_000, percent: 9, colorClass: 'bg-secondary' },
        ].map(it => (
          <View key={it.cat} className="flex-row items-center justify-between py-2.5 border-b border-border/40">
            <View className="flex-row items-center flex-1 mr-2">
              <View className={`h-3 w-3 rounded-md mr-2.5 ${it.colorClass}`} />
              <AppText variant="label" className="text-text font-medium">
                {it.cat}
              </AppText>
            </View>
            <AppText variant="label" className="font-bold text-text">
              UGX {it.amount.toLocaleString()} ({it.percent}%)
            </AppText>
          </View>
        ))}
      </View>

      {/* Waiter Leaderboard */}
      <View className="rounded-3xl bg-surface border border-border p-5 mb-5 shadow-sm">
        <AppText variant="title" className="text-lg font-bold text-text mb-3">
          Server Performance Leaderboard
        </AppText>

        {[
          { rank: '1', name: 'Brenda K.', sales: 580_000, covers: 24 },
          { rank: '2', name: 'David M.', sales: 490_000, covers: 20 },
          { rank: '3', name: 'Faith N.', sales: 350_000, covers: 16 },
        ].map(server => (
          <View key={server.rank} className="flex-row items-center justify-between py-2.5 border-b border-border/40">
            <View className="flex-row items-center">
              <View className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 items-center justify-center mr-3">
                <AppText variant="label" className="font-bold text-primary text-xs">
                  #{server.rank}
                </AppText>
              </View>
              <View>
                <AppText variant="label" className="font-bold text-text">
                  {server.name}
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-[11px]">
                  {server.covers} Covers Served
                </AppText>
              </View>
            </View>
            <AppText variant="label" className="font-bold text-primary">
              UGX {server.sales.toLocaleString()}
            </AppText>
          </View>
        ))}
      </View>
    </ScreenTemplate>
  );
};
