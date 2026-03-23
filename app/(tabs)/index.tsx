import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  Modal, Alert, StyleSheet, FlatList, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

interface QuickAction {
  id: string;
  icon: string;
  labelEn: string;
  labelAr: string;
  route: string;
  color: string;
  requiresConnection?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'screen', icon: 'display', labelEn: 'Screen', labelAr: 'الشاشة', route: '/screens/remote-screen', color: '#00D4FF', requiresConnection: true },
  { id: 'mouse', icon: 'cursorarrow', labelEn: 'Mouse', labelAr: 'الماوس', route: '/screens/mouse-control', color: '#7C3AED', requiresConnection: true },
  { id: 'keyboard', icon: 'keyboard', labelEn: 'Keyboard', labelAr: 'لوحة المفاتيح', route: '/screens/keyboard-control', color: '#10B981', requiresConnection: true },
  { id: 'drawing', icon: 'paintbrush.fill', labelEn: 'Drawing', labelAr: 'الرسم', route: '/screens/drawing-board', color: '#F59E0B', requiresConnection: true },
  { id: 'files', icon: 'folder.fill', labelEn: 'Files', labelAr: 'الملفات', route: '/screens/file-manager', color: '#3B82F6', requiresConnection: true },
  { id: 'transfer', icon: 'tray.and.arrow.up', labelEn: 'Transfer', labelAr: 'نقل الملفات', route: '/screens/file-transfer', color: '#EC4899', requiresConnection: true },
  { id: 'monitor', icon: 'chart.line.uptrend.xyaxis', labelEn: 'Monitor', labelAr: 'المراقبة', route: '/screens/system-monitor', color: '#8B5CF6', requiresConnection: true },
  { id: 'powershell', icon: 'terminal.fill', labelEn: 'PowerShell', labelAr: 'باور شيل', route: '/screens/powershell', color: '#1D4ED8', requiresConnection: true },
  { id: 'terminal', icon: 'terminal', labelEn: 'Terminal', labelAr: 'الطرفية', route: '/screens/terminal', color: '#059669', requiresConnection: true },
  { id: 'tasks', icon: 'list.dash', labelEn: 'Tasks', labelAr: 'المهام', route: '/screens/task-manager', color: '#DC2626', requiresConnection: true },
  { id: 'voice', icon: 'phone.fill', labelEn: 'Voice', labelAr: 'صوتية', route: '/screens/voice-call', color: '#16A34A', requiresConnection: true },
  { id: 'video', icon: 'video.fill', labelEn: 'Video', labelAr: 'مرئية', route: '/screens/video-call', color: '#7C3AED', requiresConnection: true },
  { id: 'mic', icon: 'mic.fill', labelEn: 'Mic', labelAr: 'ميكروفون', route: '/screens/voice-call', color: '#0891B2', requiresConnection: true },
  { id: 'print', icon: 'printer.fill', labelEn: 'Print', labelAr: 'طباعة', route: '/screens/file-manager', color: '#B45309', requiresConnection: true },
  { id: 'power', icon: 'power', labelEn: 'Power', labelAr: 'الطاقة', route: '/screens/power-controls', color: '#EF4444', requiresConnection: true },
  { id: 'lock', icon: 'lock.fill', labelEn: 'Lock', labelAr: 'قفل', route: '/screens/power-controls', color: '#6B7280', requiresConnection: true },
];

export default function DashboardScreen() {
  const colors = useColors();
  const { t, language, isRTL } = useI18n();
  const { status, connect, disconnect, currentProfile, systemStats, profiles, lastError, authRequired, authenticate, latency } = useConnection();
  const [showConnect, setShowConnect] = useState(false);
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('8765');
  const [profileName, setProfileName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [password, setPassword] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPassword, setAuthPassword] = useState('');

  const isConnected = status === 'connected';
  const isConnecting2 = status === 'connecting' || status === 'authenticating';

  const handleConnect = async () => {
    if (!ip.trim()) {
      Alert.alert(t('error'), t('enterIp'));
      return;
    }
    setIsConnecting(true);
    await connect(ip.trim(), port.trim() || '8765', profileName.trim() || ip.trim(), password.trim() || undefined);
    setIsConnecting(false);
    setShowConnect(false);
  };

  const handleQuickAction = (action: QuickAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (action.requiresConnection && !isConnected) {
      setShowConnect(true);
      return;
    }
    router.push(action.route as any);
  };

  const handleProfileConnect = (profile: any) => {
    setIp(profile.ip);
    setPort(profile.port);
    setProfileName(profile.name);
    setPassword(profile.password || '');
    connect(profile.ip, profile.port, profile.name, profile.password);
    setShowConnect(false);
  };

  React.useEffect(() => {
    if (authRequired && status === 'authenticating') {
      setShowAuthModal(true);
    }
  }, [authRequired, status]);

  const statusColor = isConnected ? colors.success : isConnecting2 ? colors.warning : colors.error;
  const statusText = isConnected ? t('connected') : status === 'authenticating' ? 'Authenticating...' : isConnecting2 ? t('connecting') : t('disconnected');

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <View>
              <Text style={[styles.headerTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('appName')}
              </Text>
              <Text style={[styles.headerSubtitle, { color: statusColor, textAlign: isRTL ? 'right' : 'left' }]}>
                {statusText}
                {isConnected && currentProfile ? ` • ${currentProfile.ip}` : ''}
              </Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.connectBtn,
              { backgroundColor: isConnected ? colors.error : colors.primary },
              pressed && { opacity: 0.8 }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (isConnected) {
                Alert.alert(t('disconnect'), t('disconnected') + '?', [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('confirm'), onPress: disconnect, style: 'destructive' }
                ]);
              } else {
                setShowConnect(true);
              }
            }}
          >
            <Text style={styles.connectBtnText}>
              {isConnected ? t('disconnect') : t('connect')}
            </Text>
          </Pressable>
        </View>

        {/* System Stats Bar */}
        {isConnected && systemStats && (
          <View style={[styles.statsBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <StatItem label={t('cpu')} value={`${Math.round(systemStats.cpu)}%`} color={systemStats.cpu > 80 ? colors.error : colors.primary} colors={colors} />
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <StatItem label={t('ram')} value={`${Math.round(systemStats.ram)}%`} color={systemStats.ram > 85 ? colors.error : '#7C3AED'} colors={colors} />
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <StatItem label={t('disk')} value={`${Math.round(systemStats.disk)}%`} color={colors.warning} colors={colors} />
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <StatItem label={t('network')} value={`${formatBytes(systemStats.networkIn)}/s`} color={colors.success} colors={colors} />
          </View>
        )}

        {/* PC Info Card */}
        {isConnected && systemStats && (
          <View style={[styles.pcCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.pcIconBg, { backgroundColor: colors.primary + '20' }]}>
                <IconSymbol name="desktopcomputer" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pcName, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
                  {systemStats.pcName || currentProfile?.name || 'PC'}
                </Text>
                <Text style={[styles.pcOs, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>
                  {systemStats.os || 'Windows'} • {t('uptime')}: {systemStats.uptime || '--'}
                </Text>
              </View>
              <View style={[styles.connectedBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.connectedBadgeText, { color: colors.success }]}>{t('connected')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Not Connected Banner */}
        {!isConnected && (
          <Pressable
            style={({ pressed }) => [
              styles.connectBanner,
              { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' },
              pressed && { opacity: 0.8 }
            ]}
            onPress={() => setShowConnect(true)}
          >
            <IconSymbol name="wifi" size={28} color={colors.primary} />
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.bannerTitle, { color: colors.primary }]}>{t('connectionTitle')}</Text>
              <Text style={[styles.bannerSubtitle, { color: colors.muted }]}>{t('ipPlaceholder')}</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.primary} />
          </Pressable>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('quickActions')}
          </Text>
        </View>

        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 }
              ]}
              onPress={() => handleQuickAction(action)}
            >
              <View style={[styles.actionIconBg, { backgroundColor: action.color + '20' }]}>
                <IconSymbol name={action.icon as any} size={26} color={action.color} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.foreground }]} numberOfLines={1}>
                {language === 'ar' ? action.labelAr : action.labelEn}
              </Text>
              {action.requiresConnection && !isConnected && (
                <View style={[styles.lockOverlay, { backgroundColor: colors.background + 'AA' }]}>
                  <IconSymbol name="lock.fill" size={14} color={colors.muted} />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Connect Modal */}
      <Modal visible={showConnect} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t('connectionTitle')}</Text>
              <Pressable onPress={() => setShowConnect(false)} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <IconSymbol name="xmark" size={24} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 500 }}>
              <View style={styles.modalBody}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>{t('ipAddress')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  placeholder={t('ipPlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={ip}
                  onChangeText={setIp}
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                />

                <Text style={[styles.inputLabel, { color: colors.muted }]}>{t('port')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  placeholder={t('portPlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={port}
                  onChangeText={setPort}
                  keyboardType="number-pad"
                />

                <Text style={[styles.inputLabel, { color: colors.muted }]}>{t('profileName')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="My PC"
                  placeholderTextColor={colors.muted}
                  value={profileName}
                  onChangeText={setProfileName}
                />

                <Text style={[styles.inputLabel, { color: colors.muted }]}>Password (optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="Leave empty if no password"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <Pressable
                  style={({ pressed }) => [
                    styles.connectModalBtn,
                    { backgroundColor: colors.primary },
                    pressed && { opacity: 0.85 }
                  ]}
                  onPress={handleConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.connectModalBtnText}>{t('connect')}</Text>
                  )}
                </Pressable>

                {lastError && (
                  <Text style={[styles.errorText, { color: colors.error }]}>{lastError}</Text>
                )}

                {/* Recent Connections */}
                {profiles.length > 0 && (
                  <>
                    <Text style={[styles.recentTitle, { color: colors.muted }]}>{t('recentConnections')}</Text>
                    {profiles.map((profile) => (
                      <Pressable
                        key={profile.id}
                        style={({ pressed }) => [
                          styles.profileItem,
                          { backgroundColor: colors.background, borderColor: colors.border },
                          pressed && { opacity: 0.8 }
                        ]}
                        onPress={() => handleProfileConnect(profile)}
                      >
                        <View style={[styles.profileIcon, { backgroundColor: colors.primary + '20' }]}>
                          <IconSymbol name="desktopcomputer" size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.profileName, { color: colors.foreground }]}>{profile.name}</Text>
                          <Text style={[styles.profileIp, { color: colors.muted }]}>{profile.ip}:{profile.port}</Text>
                        </View>
                        <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                      </Pressable>
                    ))}
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Auth Modal */}
      <Modal visible={showAuthModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface, borderRadius: 20, margin: 24 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Authentication Required</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Enter PC Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Password"
                placeholderTextColor={colors.muted}
                value={authPassword}
                onChangeText={setAuthPassword}
                secureTextEntry
                autoFocus
              />
              <Pressable
                style={({ pressed }) => [styles.connectModalBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
                onPress={() => { authenticate(authPassword); setShowAuthModal(false); setAuthPassword(''); }}
              >
                <Text style={styles.connectModalBtnText}>Authenticate</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.connectModalBtn, { backgroundColor: colors.error, marginTop: 8 }, pressed && { opacity: 0.85 }]}
                onPress={() => { disconnect(); setShowAuthModal(false); }}
              >
                <Text style={styles.connectModalBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function StatItem({ label, value, color, colors }: { label: string; value: string; color: string; colors: any }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  connectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  connectBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    marginHorizontal: 4,
  },
  pcCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  pcIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pcName: {
    fontSize: 16,
    fontWeight: '600',
  },
  pcOs: {
    fontSize: 12,
    marginTop: 2,
  },
  connectedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  connectedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  connectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  actionCard: {
    width: '22%',
    aspectRatio: 0.9,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  connectModalBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  connectModalBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 13,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  profileIp: {
    fontSize: 12,
    marginTop: 1,
  },
});
