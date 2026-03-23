import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

interface ChartPoint {
  value: number;
  time: number;
}

export default function MonitorScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { status, systemStats, sendMessage, processes } = useConnection();
  const [cpuHistory, setCpuHistory] = useState<ChartPoint[]>([]);
  const [ramHistory, setRamHistory] = useState<ChartPoint[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isConnected = status === 'connected';

  useEffect(() => {
    if (isConnected) {
      sendMessage('get_stats');
      sendMessage('get_processes');
      intervalRef.current = setInterval(() => {
        sendMessage('get_stats');
        sendMessage('get_processes');
      }, 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isConnected]);

  useEffect(() => {
    if (systemStats) {
      const now = Date.now();
      setCpuHistory(prev => [...prev.slice(-29), { value: systemStats.cpu, time: now }]);
      setRamHistory(prev => [...prev.slice(-29), { value: systemStats.ram, time: now }]);
    }
  }, [systemStats]);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B/s`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatUptime = (uptime: string) => uptime || '--';

  if (!isConnected) {
    return (
      <ScreenContainer>
        <View style={styles.emptyState}>
          <IconSymbol name="chart.bar" size={60} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('systemMonitorTitle')}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>{t('connectionTitle')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('systemMonitorTitle')}</Text>
        <Pressable
          style={({ pressed }) => [styles.refreshBtn, { backgroundColor: colors.primary + '20' }, pressed && { opacity: 0.7 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); sendMessage('get_stats'); sendMessage('get_processes'); }}
        >
          <IconSymbol name="arrow.clockwise" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* CPU Card */}
        <MetricCard
          title={t('cpuUsage')}
          value={systemStats ? `${Math.round(systemStats.cpu)}%` : '--'}
          icon="cpu"
          color="#00D4FF"
          history={cpuHistory}
          colors={colors}
        />

        {/* RAM Card */}
        <MetricCard
          title={t('ramUsage')}
          value={systemStats ? `${Math.round(systemStats.ram)}%` : '--'}
          subtitle={systemStats ? `${formatGB(systemStats.ramUsed)} / ${formatGB(systemStats.ramTotal)} GB` : ''}
          icon="memorychip"
          color="#7C3AED"
          history={ramHistory}
          colors={colors}
        />

        {/* Disk & Network Row */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={[styles.smallCard, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}>
            <View style={[styles.smallIconBg, { backgroundColor: '#F59E0B20' }]}>
              <IconSymbol name="memorychip" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.smallLabel, { color: colors.muted }]}>{t('diskUsage')}</Text>
            <Text style={[styles.smallValue, { color: colors.foreground }]}>
              {systemStats ? `${Math.round(systemStats.disk)}%` : '--'}
            </Text>
            <MiniProgressBar value={systemStats?.disk || 0} color="#F59E0B" />
          </View>

          <View style={[styles.smallCard, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}>
            <View style={[styles.smallIconBg, { backgroundColor: '#10B98120' }]}>
              <IconSymbol name="waveform.path" size={20} color="#10B981" />
            </View>
            <Text style={[styles.smallLabel, { color: colors.muted }]}>{t('networkUsage')}</Text>
            <Text style={[styles.smallValue, { color: colors.foreground }]}>
              {systemStats ? formatBytes(systemStats.networkIn) : '--'}
            </Text>
            <Text style={[styles.networkOut, { color: colors.muted }]}>
              ↑ {systemStats ? formatBytes(systemStats.networkOut) : '--'}
            </Text>
          </View>
        </View>

        {/* System Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t('systemStatus')}</Text>
          <InfoRow label={t('pcName')} value={systemStats?.pcName || '--'} colors={colors} />
          <InfoRow label="OS" value={systemStats?.os || '--'} colors={colors} />
          <InfoRow label={t('uptime')} value={formatUptime(systemStats?.uptime || '')} colors={colors} />
          {systemStats?.temperature && (
            <InfoRow label={t('temperature')} value={`${systemStats.temperature}°C`} colors={colors} />
          )}
        </View>

        {/* Top Processes */}
        <View style={[styles.processCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t('processes')}</Text>
          {processes.slice(0, 8).map((proc, idx) => (
            <View key={proc.pid} style={[styles.processRow, { borderTopColor: colors.border, borderTopWidth: idx > 0 ? 0.5 : 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.processName, { color: colors.foreground }]} numberOfLines={1}>{proc.name}</Text>
                <Text style={[styles.processPid, { color: colors.muted }]}>PID: {proc.pid}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.processCpu, { color: proc.cpu > 50 ? colors.error : colors.primary }]}>
                  CPU {proc.cpu.toFixed(1)}%
                </Text>
                <Text style={[styles.processMem, { color: colors.muted }]}>
                  MEM {proc.memory.toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function MetricCard({ title, value, subtitle, icon, color, history, colors }: any) {
  const maxVal = Math.max(...history.map((h: ChartPoint) => h.value), 100);
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.metricIconBg, { backgroundColor: color + '20' }]}>
            <IconSymbol name={icon} size={20} color={color} />
          </View>
          <View>
            <Text style={[styles.metricTitle, { color: colors.muted }]}>{title}</Text>
            {subtitle && <Text style={[styles.metricSubtitle, { color: colors.muted }]}>{subtitle}</Text>}
          </View>
        </View>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
      </View>
      {/* Mini Line Chart */}
      <View style={styles.chartContainer}>
        {history.length > 1 && history.map((point: ChartPoint, idx: number) => {
          const h = (point.value / maxVal) * 40;
          return (
            <View
              key={idx}
              style={[styles.chartBar, { height: Math.max(2, h), backgroundColor: color + (idx === history.length - 1 ? 'FF' : '60') }]}
            />
          );
        })}
      </View>
      <MiniProgressBar value={history.length > 0 ? history[history.length - 1]?.value || 0 : 0} color={color} />
    </View>
  );
}

function MiniProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${Math.min(100, value)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function formatGB(mb: number) {
  if (!mb) return '0';
  return (mb / 1024).toFixed(1);
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  refreshBtn: { padding: 8, borderRadius: 10 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  emptySubtitle: { fontSize: 14 },
  metricCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  metricIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricTitle: { fontSize: 13, fontWeight: '500' },
  metricSubtitle: { fontSize: 11, marginTop: 1 },
  metricValue: { fontSize: 28, fontWeight: '700' },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 44,
    gap: 2,
    marginBottom: 8,
  },
  chartBar: { flex: 1, borderRadius: 2 },
  progressBg: { height: 4, backgroundColor: '#1E3A5F', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  smallCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 4 },
  smallIconBg: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  smallLabel: { fontSize: 11, fontWeight: '500' },
  smallValue: { fontSize: 22, fontWeight: '700' },
  networkOut: { fontSize: 11 },
  infoCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '500' },
  processCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  processRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  processName: { fontSize: 13, fontWeight: '500' },
  processPid: { fontSize: 11, marginTop: 1 },
  processCpu: { fontSize: 12, fontWeight: '600' },
  processMem: { fontSize: 11, marginTop: 1 },
});
