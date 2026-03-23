import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert, TextInput, Modal
} from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

interface PowerAction {
  id: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  color: string;
  command: string;
  descEn: string;
  descAr: string;
  dangerous: boolean;
}

const POWER_ACTIONS: PowerAction[] = [
  {
    id: 'shutdown',
    labelEn: 'Shutdown',
    labelAr: 'إيقاف التشغيل',
    icon: 'power',
    color: '#EF4444',
    command: 'shutdown /s /t 0',
    descEn: 'Completely shut down the PC',
    descAr: 'إيقاف تشغيل الحاسوب بالكامل',
    dangerous: true,
  },
  {
    id: 'restart',
    labelEn: 'Restart',
    labelAr: 'إعادة التشغيل',
    icon: 'arrow.clockwise',
    color: '#F59E0B',
    command: 'shutdown /r /t 0',
    descEn: 'Restart the PC',
    descAr: 'إعادة تشغيل الحاسوب',
    dangerous: true,
  },
  {
    id: 'sleep',
    labelEn: 'Sleep',
    labelAr: 'وضع السكون',
    icon: 'moon.stars',
    color: '#7C3AED',
    command: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0',
    descEn: 'Put PC into sleep mode',
    descAr: 'وضع الحاسوب في وضع السكون',
    dangerous: false,
  },
  {
    id: 'hibernate',
    labelEn: 'Hibernate',
    labelAr: 'وضع السبات',
    icon: 'bed.double.fill',
    color: '#0891B2',
    command: 'shutdown /h',
    descEn: 'Hibernate the PC',
    descAr: 'وضع الحاسوب في وضع السبات',
    dangerous: false,
  },
  {
    id: 'lock',
    labelEn: 'Lock Screen',
    labelAr: 'قفل الشاشة',
    icon: 'lock.fill',
    color: '#10B981',
    command: 'Rundll32.exe user32.dll,LockWorkStation',
    descEn: 'Lock the workstation',
    descAr: 'قفل محطة العمل',
    dangerous: false,
  },
  {
    id: 'logoff',
    labelEn: 'Log Off',
    labelAr: 'تسجيل الخروج',
    icon: 'person.fill.xmark',
    color: '#EC4899',
    command: 'shutdown /l',
    descEn: 'Log off current user',
    descAr: 'تسجيل خروج المستخدم الحالي',
    dangerous: true,
  },
  {
    id: 'scheduled_shutdown',
    labelEn: 'Scheduled Shutdown',
    labelAr: 'إيقاف مجدول',
    icon: 'clock.badge.xmark',
    color: '#DC2626',
    command: 'shutdown /s /t {seconds}',
    descEn: 'Schedule shutdown after delay',
    descAr: 'جدولة الإيقاف بعد تأخير',
    dangerous: false,
  },
  {
    id: 'cancel_shutdown',
    labelEn: 'Cancel Shutdown',
    labelAr: 'إلغاء الإيقاف',
    icon: 'xmark.circle.fill',
    color: '#16A34A',
    command: 'shutdown /a',
    descEn: 'Cancel any pending shutdown',
    descAr: 'إلغاء أي إيقاف معلق',
    dangerous: false,
  },
];

export default function PowerControlsScreen() {
  const colors = useColors();
  const { t, language } = useI18n();
  const { sendMessage, status } = useConnection();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleMinutes, setScheduleMinutes] = useState('30');
  const isConnected = status === 'connected';

  const handleAction = (action: PowerAction) => {
    if (!isConnected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (action.id === 'scheduled_shutdown') {
      setShowScheduleModal(true);
      return;
    }

    const confirmTitle = language === 'ar' ? action.labelAr : action.labelEn;
    const confirmMsg = language === 'ar' ? action.descAr : action.descEn;

    if (action.dangerous) {
      Alert.alert(
        confirmTitle,
        `${language === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?'}\n${confirmMsg}`,
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: language === 'ar' ? 'تأكيد' : 'Confirm',
            style: 'destructive',
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              sendMessage('powershell_exec', { command: action.command });
            }
          }
        ]
      );
    } else {
      sendMessage('powershell_exec', { command: action.command });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleScheduledShutdown = () => {
    const minutes = parseInt(scheduleMinutes);
    if (isNaN(minutes) || minutes <= 0) return;
    const seconds = minutes * 60;
    sendMessage('powershell_exec', { command: `shutdown /s /t ${seconds}` });
    setShowScheduleModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      language === 'ar' ? 'تم الجدولة' : 'Scheduled',
      language === 'ar' ? `سيتم إيقاف التشغيل بعد ${minutes} دقيقة` : `PC will shutdown in ${minutes} minutes`
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {language === 'ar' ? 'التحكم بالطاقة' : 'Power Controls'}
        </Text>
        <View style={[styles.connBadge, { backgroundColor: isConnected ? colors.success + '20' : colors.error + '20' }]}>
          <View style={[styles.connDot, { backgroundColor: isConnected ? colors.success : colors.error }]} />
          <Text style={[styles.connText, { color: isConnected ? colors.success : colors.error }]}>
            {isConnected ? (language === 'ar' ? 'متصل' : 'Connected') : (language === 'ar' ? 'غير متصل' : 'Offline')}
          </Text>
        </View>
      </View>

      {!isConnected && (
        <View style={[styles.offlineNotice, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
          <IconSymbol name="wifi.slash" size={18} color={colors.error} />
          <Text style={[styles.offlineText, { color: colors.error }]}>
            {language === 'ar' ? 'يجب الاتصال بالحاسوب أولاً' : 'Connect to PC first'}
          </Text>
        </View>
      )}

      <View style={{ flex: 1, padding: 16 }}>
        <View style={styles.grid}>
          {POWER_ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: colors.surface, borderColor: action.dangerous ? action.color + '40' : colors.border },
                pressed && { transform: [{ scale: 0.96 }], backgroundColor: action.color + '15' },
                !isConnected && { opacity: 0.5 }
              ]}
              onPress={() => handleAction(action)}
              disabled={!isConnected}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                <IconSymbol name={action.icon as any} size={28} color={action.color} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>
                {language === 'ar' ? action.labelAr : action.labelEn}
              </Text>
              <Text style={[styles.actionDesc, { color: colors.muted }]} numberOfLines={2}>
                {language === 'ar' ? action.descAr : action.descEn}
              </Text>
              {action.dangerous && (
                <View style={[styles.dangerBadge, { backgroundColor: action.color + '20' }]}>
                  <Text style={[styles.dangerText, { color: action.color }]}>
                    {language === 'ar' ? '⚠ تأكيد' : '⚠ Confirm'}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Schedule Modal */}
      <Modal visible={showScheduleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {language === 'ar' ? 'إيقاف تشغيل مجدول' : 'Scheduled Shutdown'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              {language === 'ar' ? 'أدخل عدد الدقائق' : 'Enter minutes'}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              value={scheduleMinutes}
              onChangeText={setScheduleMinutes}
              keyboardType="numeric"
              textAlign="center"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setShowScheduleModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.muted }]}>{t('cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleScheduledShutdown}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                  {language === 'ar' ? 'جدولة' : 'Schedule'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  connBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  connDot: { width: 6, height: 6, borderRadius: 3 },
  connText: { fontSize: 11, fontWeight: '600' },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  offlineText: { fontSize: 13, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    gap: 8,
    alignItems: 'center',
  },
  actionIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  actionDesc: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  dangerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dangerText: { fontSize: 10, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '80%', borderRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  modalSubtitle: { fontSize: 13, textAlign: 'center' },
  modalInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 24, fontWeight: '700' },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontWeight: '700', fontSize: 14 },
});
