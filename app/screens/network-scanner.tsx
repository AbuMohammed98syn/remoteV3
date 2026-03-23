import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Animated
} from 'react-native';
import * as Network from 'expo-network';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';

interface DiscoveredDevice {
  ip: string;
  port: number;
  name: string;
  latency: number;
  status: 'online' | 'checking';
}

export default function NetworkScannerScreen() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const { connect } = useConnection();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [progress, setProgress] = useState(0);
  const [localIP, setLocalIP] = useState('');
  const [subnet, setSubnet] = useState('');
  const scanRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getLocalNetwork();
  }, []);

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [scanning]);

  const getLocalNetwork = async () => {
    try {
      const ip = await Network.getIpAddressAsync();
      setLocalIP(ip);
      const parts = ip.split('.');
      if (parts.length === 4) {
        setSubnet(`${parts[0]}.${parts[1]}.${parts[2]}`);
      }
    } catch (e) {
      setLocalIP('Unknown');
    }
  };

  const scanNetwork = async () => {
    if (!subnet) {
      await getLocalNetwork();
      return;
    }

    setScanning(true);
    setDevices([]);
    setProgress(0);
    scanRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const PORT = 8765;
    const total = 254;
    let checked = 0;
    const found: DiscoveredDevice[] = [];

    // Scan in batches of 20 for speed
    const batchSize = 20;
    for (let start = 1; start <= total && scanRef.current; start += batchSize) {
      const batch = [];
      for (let i = start; i < Math.min(start + batchSize, total + 1); i++) {
        batch.push(i);
      }

      await Promise.all(batch.map(async (i) => {
        const ip = `${subnet}.${i}`;
        const start = Date.now();
        try {
          const ws = new WebSocket(`ws://${ip}:${PORT}`);
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              ws.close();
              resolve();
            }, 500);

            ws.onopen = () => {
              clearTimeout(timeout);
              const latency = Date.now() - start;
              const device: DiscoveredDevice = {
                ip,
                port: PORT,
                name: `PC (${ip})`,
                latency,
                status: 'online',
              };
              found.push(device);
              setDevices([...found]);
              ws.send(JSON.stringify({ type: 'get_system_info' }));
              ws.onmessage = (e) => {
                try {
                  const msg = JSON.parse(e.data);
                  if (msg.type === 'system_info' || msg.type === 'system_stats') {
                    const pcName = msg.data?.pcName || msg.data?.pc_name || ip;
                    const idx = found.findIndex(d => d.ip === ip);
                    if (idx >= 0) {
                      found[idx].name = pcName;
                      setDevices([...found]);
                    }
                  }
                } catch {}
                ws.close();
              };
              setTimeout(() => ws.close(), 1000);
              resolve();
            };

            ws.onerror = () => {
              clearTimeout(timeout);
              resolve();
            };
          });
        } catch {}
        checked++;
        setProgress(Math.round((checked / total) * 100));
      }));
    }

    setScanning(false);
    scanRef.current = false;
    if (found.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const stopScan = () => {
    scanRef.current = false;
    setScanning(false);
  };

  const connectToDevice = (device: DiscoveredDevice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    connect(device.ip, device.port.toString(), device.name);
    router.back();
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => { stopScan(); router.back(); }} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name={isRTL ? 'chevron.right' : 'chevron.left'} size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isRTL ? 'فحص الشبكة' : 'Network Scanner'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Network Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <IconSymbol name="wifi" size={20} color={colors.primary} />
            <Text style={[styles.infoLabel, { color: colors.muted }]}>{isRTL ? 'عنوان IP الخاص بك' : 'Your IP'}</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{localIP || '...'}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <IconSymbol name="network" size={20} color={colors.primary} />
            <Text style={[styles.infoLabel, { color: colors.muted }]}>{isRTL ? 'الشبكة الفرعية' : 'Subnet'}</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{subnet ? `${subnet}.0/24` : '...'}</Text>
          </View>
        </View>

        {/* Scan Button */}
        <View style={styles.scanCenter}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable
              style={[styles.scanBtn, { backgroundColor: scanning ? colors.error : colors.primary }]}
              onPress={scanning ? stopScan : scanNetwork}
            >
              {scanning ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.scanBtnText}>{isRTL ? 'إيقاف الفحص' : 'Stop Scan'}</Text>
                </>
              ) : (
                <>
                  <IconSymbol name="antenna.radiowaves.left.and.right" size={24} color="#fff" />
                  <Text style={styles.scanBtnText}>{isRTL ? 'فحص الشبكة' : 'Scan Network'}</Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          {scanning && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress}%` }]} />
              </View>
              <Text style={[styles.progressText, { color: colors.muted }]}>{progress}%</Text>
            </View>
          )}
        </View>

        {/* Results */}
        {devices.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {isRTL ? `الأجهزة المكتشفة (${devices.length})` : `Discovered Devices (${devices.length})`}
            </Text>
            {devices.map(device => (
              <Pressable
                key={device.ip}
                style={({ pressed }) => [
                  styles.deviceCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { transform: [{ scale: 0.98 }] }
                ]}
                onPress={() => connectToDevice(device)}
              >
                <View style={[styles.deviceIcon, { backgroundColor: colors.primary + '20' }]}>
                  <IconSymbol name="desktopcomputer" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deviceName, { color: colors.foreground }]}>{device.name}</Text>
                  <Text style={[styles.deviceIp, { color: colors.muted }]}>{device.ip}:{device.port}</Text>
                </View>
                <View style={styles.deviceRight}>
                  <View style={[styles.onlineBadge, { backgroundColor: colors.success + '20' }]}>
                    <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
                    <Text style={[styles.onlineText, { color: colors.success }]}>
                      {device.latency}ms
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </View>
              </Pressable>
            ))}
          </>
        )}

        {!scanning && devices.length === 0 && progress > 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="wifi.slash" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {isRTL ? 'لم يتم العثور على أجهزة. تأكد من تشغيل السيرفر على الحاسوب.' : 'No devices found. Make sure the server is running on your PC.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  infoCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { flex: 1, fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: 12 },
  scanCenter: { alignItems: 'center', marginBottom: 28 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 50 },
  scanBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  progressContainer: { width: '100%', marginTop: 16, alignItems: 'center', gap: 6 },
  progressBar: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  deviceCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12 },
  deviceIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deviceName: { fontSize: 15, fontWeight: '600' },
  deviceIp: { fontSize: 12, marginTop: 2 },
  deviceRight: { alignItems: 'flex-end', gap: 6 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: 32, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
