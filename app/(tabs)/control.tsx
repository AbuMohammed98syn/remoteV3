import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

const CONTROL_ITEMS = [
  { id: 'screen', icon: 'display', labelEn: 'Remote Screen', labelAr: 'الشاشة عن بعد', route: '/screens/remote-screen', color: '#00D4FF', desc: 'View and control PC screen' },
  { id: 'mouse', icon: 'cursorarrow', labelEn: 'Mouse & Trackpad', labelAr: 'الماوس ولوحة اللمس', route: '/screens/mouse-control', color: '#7C3AED', desc: 'Control mouse cursor' },
  { id: 'keyboard', icon: 'keyboard', labelEn: 'Keyboard', labelAr: 'لوحة المفاتيح', route: '/screens/keyboard-control', color: '#10B981', desc: 'Type and send keystrokes' },
  { id: 'drawing', icon: 'paintbrush.fill', labelEn: 'Drawing Board', labelAr: 'لوحة الرسم', route: '/screens/drawing-board', color: '#F59E0B', desc: 'Draw and annotate on screen' },
  { id: 'voice', icon: 'phone.fill', labelEn: 'Voice Call', labelAr: 'مكالمة صوتية', route: '/screens/voice-call', color: '#16A34A', desc: 'Direct voice call with PC' },
  { id: 'video', icon: 'video.fill', labelEn: 'Video Call', labelAr: 'مكالمة مرئية', route: '/screens/video-call', color: '#7C3AED', desc: 'Video call with PC camera' },
  { id: 'mic', icon: 'mic.fill', labelEn: 'Mic Stream', labelAr: 'بث الميكروفون', route: '/screens/voice-call', color: '#0891B2', desc: 'Stream microphone to PC' },
  { id: 'power', icon: 'power', labelEn: 'Power Controls', labelAr: 'التحكم بالطاقة', route: '/screens/power-controls', color: '#EF4444', desc: 'Shutdown, restart, sleep, lock' },
];

export default function ControlScreen() {
  const colors = useColors();
  const { t, language, isRTL } = useI18n();
  const { status } = useConnection();
  const isConnected = status === 'connected';

  const handleNav = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isConnected) return;
    router.push(route as any);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {language === 'ar' ? 'التحكم' : 'Control'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: isConnected ? colors.success + '20' : colors.error + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? colors.success : colors.error }]} />
          <Text style={[styles.statusText, { color: isConnected ? colors.success : colors.error }]}>
            {isConnected ? t('connected') : t('disconnected')}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 10 }}>
        {CONTROL_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.controlCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
              !isConnected && { opacity: 0.5 }
            ]}
            onPress={() => handleNav(item.route)}
          >
            <View style={[styles.iconBg, { backgroundColor: item.color + '20' }]}>
              <IconSymbol name={item.icon as any} size={26} color={item.color} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.itemTitle, { color: colors.foreground }]}>
                {language === 'ar' ? item.labelAr : item.labelEn}
              </Text>
              <Text style={[styles.itemDesc, { color: colors.muted }]}>{item.desc}</Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
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
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  controlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  iconBg: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemDesc: { fontSize: 12, marginTop: 2 },
});
