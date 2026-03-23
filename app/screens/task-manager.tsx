import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

interface Process {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
}

type SortKey = 'cpu' | 'memory' | 'name' | 'pid';

export default function TaskManagerScreen() {
  const colors = useColors();
  const { t, language } = useI18n();
  const { sendMessage, status, ws, processes } = useConnection();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('cpu');
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnected = status === 'connected';

  useEffect(() => {
    if (isConnected) {
      sendMessage('get_processes');
      intervalRef.current = setInterval(() => sendMessage('get_processes'), 3000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isConnected]);

  const handleSort = (key: SortKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const killProcess = (proc: Process) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      language === 'ar' ? 'إنهاء العملية' : 'End Process',
      `${language === 'ar' ? 'إنهاء' : 'Kill'} "${proc.name}" (PID: ${proc.pid})?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: language === 'ar' ? 'إنهاء' : 'Kill',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            sendMessage('kill_process', { pid: proc.pid });
          }
        }
      ]
    );
  };

  const filtered = processes
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const renderProcess = ({ item }: { item: Process }) => {
    const cpuHigh = item.cpu > 50;
    const memHigh = item.memory > 30;
    return (
      <View style={[styles.processRow, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.processName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.processPid, { color: colors.muted }]}>PID: {item.pid}</Text>
        </View>
        <View style={styles.processStats}>
          <View style={[styles.statBadge, { backgroundColor: cpuHigh ? colors.error + '20' : colors.surface }]}>
            <Text style={[styles.statValue, { color: cpuHigh ? colors.error : colors.primary }]}>
              {item.cpu.toFixed(1)}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>CPU</Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: memHigh ? '#7C3AED20' : colors.surface }]}>
            <Text style={[styles.statValue, { color: memHigh ? '#7C3AED' : colors.foreground }]}>
              {item.memory.toFixed(1)}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>MEM</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.killBtn, { backgroundColor: colors.error + '15' }, pressed && { opacity: 0.7 }]}
          onPress={() => killProcess(item)}
        >
          <IconSymbol name="xmark" size={14} color={colors.error} />
        </Pressable>
      </View>
    );
  };

  if (!isConnected) {
    return (
      <ScreenContainer>
        <View style={styles.emptyState}>
          <IconSymbol name="list.dash" size={60} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('taskManagerTitle')}</Text>
          <Pressable style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('back')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('taskManagerTitle')}</Text>
        <Text style={[styles.processCount, { color: colors.muted }]}>{filtered.length} {language === 'ar' ? 'عملية' : 'procs'}</Text>
        <Pressable
          style={({ pressed }) => [styles.refreshBtn, { backgroundColor: colors.primary + '20' }, pressed && { opacity: 0.7 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); sendMessage('get_processes'); }}
        >
          <IconSymbol name="arrow.clockwise" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder={language === 'ar' ? 'بحث في العمليات...' : 'Search processes...'}
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Sort Headers */}
      <View style={[styles.sortRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable style={styles.sortBtn} onPress={() => handleSort('name')}>
          <Text style={[styles.sortLabel, { color: sortKey === 'name' ? colors.primary : colors.muted }]}>
            {language === 'ar' ? 'الاسم' : 'Name'} {sortKey === 'name' ? (sortAsc ? '↑' : '↓') : ''}
          </Text>
        </Pressable>
        <Pressable style={styles.sortBtn} onPress={() => handleSort('cpu')}>
          <Text style={[styles.sortLabel, { color: sortKey === 'cpu' ? colors.primary : colors.muted }]}>
            CPU {sortKey === 'cpu' ? (sortAsc ? '↑' : '↓') : ''}
          </Text>
        </Pressable>
        <Pressable style={styles.sortBtn} onPress={() => handleSort('memory')}>
          <Text style={[styles.sortLabel, { color: sortKey === 'memory' ? colors.primary : colors.muted }]}>
            MEM {sortKey === 'memory' ? (sortAsc ? '↑' : '↓') : ''}
          </Text>
        </Pressable>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.pid.toString()}
        renderItem={renderProcess}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.emptyListText, { color: colors.muted }]}>
              {language === 'ar' ? 'جارٍ التحميل...' : 'Loading processes...'}
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  processCount: { fontSize: 12 },
  refreshBtn: { padding: 8, borderRadius: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 0.5,
  },
  searchInput: { flex: 1, fontSize: 14 },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  sortBtn: { flex: 1 },
  sortLabel: { fontSize: 12, fontWeight: '600' },
  processRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  processName: { fontSize: 13, fontWeight: '500' },
  processPid: { fontSize: 11, marginTop: 1 },
  processStats: { flexDirection: 'row', gap: 6, marginRight: 8 },
  statBadge: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statValue: { fontSize: 12, fontWeight: '700' },
  statLabel: { fontSize: 9 },
  killBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyList: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyListText: { fontSize: 14 },
});
