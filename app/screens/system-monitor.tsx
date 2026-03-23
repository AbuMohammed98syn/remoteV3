import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Dimensions, Modal, TextInput, Switch
} from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection, SystemStats } from '@/lib/connection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 80;
const MAX_POINTS = 30;

interface AlertConfig {
  cpu: number;
  ram: number;
  disk: number;
  enabled: boolean;
}

interface ChartPoint { value: number; time: number; }

function MiniChart({ data, color, height = CHART_HEIGHT }: { data: ChartPoint[]; color: string; height?: number }) {
  if (data.length < 2) return (
    <View style={{ height, backgroundColor: 'transparent' }} />
  );

  const max = 100;
  const points = data.slice(-MAX_POINTS);
  const w = CHART_WIDTH / (MAX_POINTS - 1);

  const pathPoints = points.map((p, i) => {
    const x = i * w;
    const y = height - (p.value / max) * height;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');

  // Fill area
  const fillPoints = [
    ...points.map((p, i) => ({ x: i * w, y: height - (p.value / max) * height })),
    { x: (points.length - 1) * w, y: height },
    { x: 0, y: height },
  ];

  return (
    <View style={{ height, width: CHART_WIDTH, overflow: 'hidden' }}>
      <svg width={CHART_WIDTH} height={height} viewBox={`0 0 ${CHART_WIDTH} ${height}`}>
        <defs>
          <linearGradient id={`grad_${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon
          points={fillPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill={`url(#grad_${color.replace('#', '')})`}
        />
        <polyline
          points={points.map((p, i) => `${i * w},${height - (p.value / max) * height}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </View>
  );
}

function StatCard({
  title, value, unit, color, history, icon, subtitle, alert, colors: c
}: {
  title: string; value: number; unit: string; color: string;
  history: ChartPoint[]; icon: string; subtitle?: string;
  alert?: boolean; colors: any;
}) {
  const isHigh = alert && value > 80;
  return (
    <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: isHigh ? color : c.border, borderWidth: isHigh ? 2 : 1 }]}>
      <View style={styles.statCardHeader}>
        <View style={[styles.statIconBg, { backgroundColor: color + '20' }]}>
          <IconSymbol name={icon as any} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.statTitle, { color: c.muted }]}>{title}</Text>
          {subtitle && <Text style={[styles.statSubtitle, { color: c.muted }]} numberOfLines={1}>{subtitle}</Text>}
        </View>
        <View style={styles.statValueRow}>
          <Text style={[styles.statValue, { color }]}>{Math.round(value)}</Text>
          <Text style={[styles.statUnit, { color: c.muted }]}>{unit}</Text>
        </View>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
        <View style={[styles.progressFill, { backgroundColor: color, width: `${Math.min(value, 100)}%` }]} />
      </View>
      <MiniChart data={history} color={color} />
      {isHigh && (
        <View style={[styles.alertBanner, { backgroundColor: color + '15' }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={12} color={color} />
          <Text style={[styles.alertText, { color }]}>High usage detected</Text>
        </View>
      )}
    </View>
  );
}

export default function SystemMonitorScreen() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const { status, systemStats, sendMessage, processes } = useConnection();
  const [cpuHistory, setCpuHistory] = useState<ChartPoint[]>([]);
  const [ramHistory, setRamHistory] = useState<ChartPoint[]>([]);
  const [diskHistory, setDiskHistory] = useState<ChartPoint[]>([]);
  const [netInHistory, setNetInHistory] = useState<ChartPoint[]>([]);
  const [netOutHistory, setNetOutHistory] = useState<ChartPoint[]>([]);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ cpu: 85, ram: 90, disk: 95, enabled: true });
  const [activeTab, setActiveTab] = useState<'overview' | 'processes' | 'network'>('overview');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnected = status === 'connected';

  useEffect(() => {
    loadAlertConfig();
    if (isConnected) {
      sendMessage('get_stats');
      sendMessage('get_processes');
      intervalRef.current = setInterval(() => {
        sendMessage('get_stats');
        sendMessage('get_processes');
      }, 2000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isConnected]);

  useEffect(() => {
    if (!systemStats) return;
    const now = Date.now();
    setCpuHistory(p => [...p.slice(-(MAX_POINTS - 1)), { value: systemStats.cpu, time: now }]);
    setRamHistory(p => [...p.slice(-(MAX_POINTS - 1)), { value: systemStats.ram, time: now }]);
    setDiskHistory(p => [...p.slice(-(MAX_POINTS - 1)), { value: systemStats.disk, time: now }]);
    setNetInHistory(p => [...p.slice(-(MAX_POINTS - 1)), { value: Math.min(systemStats.networkIn / 1024 / 10, 100), time: now }]);
    setNetOutHistory(p => [...p.slice(-(MAX_POINTS - 1)), { value: Math.min(systemStats.networkOut / 1024 / 10, 100), time: now }]);
  }, [systemStats]);

  const loadAlertConfig = async () => {
    const data = await AsyncStorage.getItem('alert_config');
    if (data) setAlertConfig(JSON.parse(data));
  };

  const saveAlertConfig = async (config: AlertConfig) => {
    setAlertConfig(config);
    await AsyncStorage.setItem('alert_config', JSON.stringify(config));
  };

  const formatBytes = (b: number) => {
    if (!b) return '0 B/s';
    if (b < 1024) return `${b} B/s`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB/s`;
    return `${(b / 1024 / 1024).toFixed(1)} MB/s`;
  };

  const formatRAM = (gb: number) => gb ? `${gb.toFixed(1)} GB` : '--';

  const tabs = [
    { id: 'overview', label: isRTL ? 'نظرة عامة' : 'Overview', icon: 'gauge' },
    { id: 'processes', label: isRTL ? 'العمليات' : 'Processes', icon: 'list.dash' },
    { id: 'network', label: isRTL ? 'الشبكة' : 'Network', icon: 'wifi' },
  ];

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name={isRTL ? 'chevron.right' : 'chevron.left'} size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isRTL ? 'مراقبة النظام' : 'System Monitor'}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.alertBtn, { backgroundColor: colors.warning + '20' }, pressed && { opacity: 0.7 }]}
          onPress={() => setShowAlertConfig(true)}
        >
          <IconSymbol name="bell.fill" size={18} color={colors.warning} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {tabs.map(tab => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => { setActiveTab(tab.id as any); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <IconSymbol name={tab.icon as any} size={16} color={activeTab === tab.id ? colors.primary : colors.muted} />
            <Text style={[styles.tabText, { color: activeTab === tab.id ? colors.primary : colors.muted }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {!isConnected ? (
        <View style={styles.disconnectedState}>
          <IconSymbol name="wifi.slash" size={48} color={colors.muted} />
          <Text style={[styles.disconnectedText, { color: colors.muted }]}>
            {isRTL ? 'غير متصل بالحاسوب' : 'Not connected to PC'}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {activeTab === 'overview' && systemStats && (
            <>
              {/* PC Info */}
              <View style={[styles.pcInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.pcInfoRow}>
                  <IconSymbol name="desktopcomputer" size={20} color={colors.primary} />
                  <Text style={[styles.pcName, { color: colors.foreground }]}>{systemStats.pcName || 'PC'}</Text>
                  <Text style={[styles.pcOs, { color: colors.muted }]}>{systemStats.os || 'Windows'}</Text>
                </View>
                <Text style={[styles.uptime, { color: colors.muted }]}>
                  {isRTL ? 'وقت التشغيل: ' : 'Uptime: '}{systemStats.uptime || '--'}
                </Text>
              </View>

              <StatCard title={isRTL ? 'المعالج' : 'CPU'} value={systemStats.cpu} unit="%" color="#00D4FF" history={cpuHistory} icon="cpu" alert={alertConfig.enabled} colors={colors} />
              <StatCard
                title={isRTL ? 'الذاكرة' : 'RAM'}
                value={systemStats.ram} unit="%"
                color="#7C3AED"
                history={ramHistory}
                icon="memorychip"
                subtitle={`${formatRAM(systemStats.ramUsed)} / ${formatRAM(systemStats.ramTotal)}`}
                alert={alertConfig.enabled}
                colors={colors}
              />
              <StatCard title={isRTL ? 'القرص' : 'Disk'} value={systemStats.disk} unit="%" color="#F59E0B" history={diskHistory} icon="externaldrive.fill" alert={alertConfig.enabled} colors={colors} />

              {/* Network Card */}
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconBg, { backgroundColor: '#10B98120' }]}>
                    <IconSymbol name="wifi" size={18} color="#10B981" />
                  </View>
                  <Text style={[styles.statTitle, { color: colors.muted, flex: 1 }]}>{isRTL ? 'الشبكة' : 'Network'}</Text>
                </View>
                <View style={styles.netRow}>
                  <View style={styles.netItem}>
                    <IconSymbol name="arrow.down" size={14} color="#10B981" />
                    <Text style={[styles.netLabel, { color: colors.muted }]}>{isRTL ? 'تنزيل' : 'Down'}</Text>
                    <Text style={[styles.netValue, { color: '#10B981' }]}>{formatBytes(systemStats.networkIn)}</Text>
                  </View>
                  <View style={[styles.netDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.netItem}>
                    <IconSymbol name="arrow.up" size={14} color="#EC4899" />
                    <Text style={[styles.netLabel, { color: colors.muted }]}>{isRTL ? 'رفع' : 'Up'}</Text>
                    <Text style={[styles.netValue, { color: '#EC4899' }]}>{formatBytes(systemStats.networkOut)}</Text>
                  </View>
                </View>
                <MiniChart data={netInHistory} color="#10B981" />
              </View>

              {systemStats.temperature && (
                <View style={[styles.tempCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <IconSymbol name="thermometer" size={18} color={systemStats.temperature > 80 ? colors.error : colors.warning} />
                  <Text style={[styles.tempText, { color: colors.foreground }]}>
                    {isRTL ? 'درجة الحرارة: ' : 'Temperature: '}
                    <Text style={{ color: systemStats.temperature > 80 ? colors.error : colors.warning, fontWeight: '700' }}>
                      {systemStats.temperature}°C
                    </Text>
                  </Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'processes' && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {isRTL ? `العمليات (${processes.length})` : `Processes (${processes.length})`}
              </Text>
              {processes.slice(0, 30).map((proc, i) => (
                <View key={`${proc.pid}_${i}`} style={[styles.processRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.procName, { color: colors.foreground }]} numberOfLines={1}>{proc.name}</Text>
                    <Text style={[styles.procPid, { color: colors.muted }]}>PID: {proc.pid}</Text>
                  </View>
                  <View style={styles.procStats}>
                    <Text style={[styles.procStat, { color: '#00D4FF' }]}>{proc.cpu.toFixed(1)}%</Text>
                    <Text style={[styles.procStat, { color: '#7C3AED' }]}>{proc.memory.toFixed(1)}%</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.killBtn, { backgroundColor: colors.error + '20' }, pressed && { opacity: 0.7 }]}
                    onPress={() => sendMessage('kill_process', { pid: proc.pid })}
                  >
                    <IconSymbol name="xmark" size={14} color={colors.error} />
                  </Pressable>
                </View>
              ))}
            </>
          )}

          {activeTab === 'network' && (
            <>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>
                  {isRTL ? 'سرعة التنزيل' : 'Download Speed'}
                </Text>
                <MiniChart data={netInHistory} color="#10B981" height={120} />
                <Text style={[styles.netSpeedLabel, { color: '#10B981' }]}>
                  {systemStats ? formatBytes(systemStats.networkIn) : '--'}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>
                  {isRTL ? 'سرعة الرفع' : 'Upload Speed'}
                </Text>
                <MiniChart data={netOutHistory} color="#EC4899" height={120} />
                <Text style={[styles.netSpeedLabel, { color: '#EC4899' }]}>
                  {systemStats ? formatBytes(systemStats.networkOut) : '--'}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Alert Config Modal */}
      <Modal visible={showAlertConfig} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {isRTL ? 'إعدادات التنبيهات' : 'Alert Settings'}
              </Text>
              <Pressable onPress={() => setShowAlertConfig(false)}>
                <IconSymbol name="xmark" size={24} color={colors.muted} />
              </Pressable>
            </View>
            <View style={{ padding: 20, gap: 16 }}>
              <View style={styles.alertRow}>
                <Text style={[styles.alertLabel, { color: colors.foreground }]}>
                  {isRTL ? 'تفعيل التنبيهات' : 'Enable Alerts'}
                </Text>
                <Switch
                  value={alertConfig.enabled}
                  onValueChange={(v) => saveAlertConfig({ ...alertConfig, enabled: v })}
                  trackColor={{ true: colors.primary }}
                />
              </View>
              {(['cpu', 'ram', 'disk'] as const).map(key => (
                <View key={key} style={styles.alertRow}>
                  <Text style={[styles.alertLabel, { color: colors.foreground }]}>
                    {key.toUpperCase()} {isRTL ? 'حد التنبيه' : 'Alert at'} {alertConfig[key]}%
                  </Text>
                  <TextInput
                    style={[styles.alertInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    value={alertConfig[key].toString()}
                    onChangeText={(v) => saveAlertConfig({ ...alertConfig, [key]: parseInt(v) || 80 })}
                    keyboardType="number-pad"
                  />
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  alertBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: '600' },
  disconnectedState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  disconnectedText: { fontSize: 16 },
  pcInfoCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 12 },
  pcInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  pcName: { fontSize: 15, fontWeight: '600', flex: 1 },
  pcOs: { fontSize: 12 },
  uptime: { fontSize: 12 },
  statCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  statIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statTitle: { fontSize: 14, fontWeight: '600' },
  statSubtitle: { fontSize: 11, marginTop: 1 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statUnit: { fontSize: 13 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 3 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, marginTop: 8 },
  alertText: { fontSize: 12, fontWeight: '500' },
  netRow: { flexDirection: 'row', marginBottom: 10 },
  netItem: { flex: 1, alignItems: 'center', gap: 4 },
  netLabel: { fontSize: 11 },
  netValue: { fontSize: 14, fontWeight: '700' },
  netDivider: { width: 1, marginHorizontal: 8 },
  tempCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 12 },
  tempText: { fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  processRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 6, gap: 10 },
  procName: { fontSize: 13, fontWeight: '600' },
  procPid: { fontSize: 11, marginTop: 2 },
  procStats: { flexDirection: 'row', gap: 10 },
  procStat: { fontSize: 12, fontWeight: '600', minWidth: 40, textAlign: 'right' },
  killBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  netSpeedLabel: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertLabel: { fontSize: 15 },
  alertInput: { width: 70, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, textAlign: 'center', fontSize: 15 },
});
