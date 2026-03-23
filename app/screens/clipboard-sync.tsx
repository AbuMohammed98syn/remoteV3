import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  Alert, FlatList
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';

interface ClipboardEntry {
  id: string;
  text: string;
  source: 'phone' | 'pc';
  timestamp: number;
}

export default function ClipboardSyncScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { sendMessage, ws } = useConnection();
  const [phoneClipboard, setPhoneClipboard] = useState('');
  const [pcClipboard, setPcClipboard] = useState('');
  const [history, setHistory] = useState<ClipboardEntry[]>([]);
  const [customText, setCustomText] = useState('');
  const [autoSync, setAutoSync] = useState(false);

  useEffect(() => {
    readPhoneClipboard();
    requestPcClipboard();

    // Listen for PC clipboard updates
    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'clipboard_content') {
          setPcClipboard(msg.data.text || '');
          addToHistory(msg.data.text, 'pc');
        }
      } catch {}
    };

    if (ws) {
      ws.addEventListener('message', handler);
      return () => ws.removeEventListener('message', handler);
    }
  }, [ws]);

  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(async () => {
      const text = await Clipboard.getStringAsync();
      if (text && text !== phoneClipboard) {
        setPhoneClipboard(text);
        sendToPC(text);
      }
      requestPcClipboard();
    }, 2000);
    return () => clearInterval(interval);
  }, [autoSync, phoneClipboard]);

  const readPhoneClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setPhoneClipboard(text);
  };

  const requestPcClipboard = () => {
    sendMessage('get_clipboard');
  };

  const sendToPC = (text: string) => {
    sendMessage('set_clipboard', { text });
    addToHistory(text, 'phone');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const copyToPhone = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setPhoneClipboard(text);
    addToHistory(text, 'pc');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addToHistory = (text: string, source: 'phone' | 'pc') => {
    if (!text.trim()) return;
    setHistory(prev => [
      { id: Date.now().toString(), text, source, timestamp: Date.now() },
      ...prev.filter(e => e.text !== text).slice(0, 19)
    ]);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name={isRTL ? 'chevron.right' : 'chevron.left'} size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isRTL ? 'مزامنة الحافظة' : 'Clipboard Sync'}
        </Text>
        <Pressable
          style={[styles.autoSyncBtn, { backgroundColor: autoSync ? colors.success + '20' : colors.surface, borderColor: autoSync ? colors.success : colors.border }]}
          onPress={() => {
            setAutoSync(!autoSync);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          <Text style={[styles.autoSyncText, { color: autoSync ? colors.success : colors.muted }]}>
            {isRTL ? 'تلقائي' : 'Auto'}
          </Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Phone Clipboard */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <IconSymbol name="iphone" size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {isRTL ? 'حافظة الهاتف' : 'Phone Clipboard'}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.refreshBtn, { backgroundColor: colors.primary + '20' }, pressed && { opacity: 0.7 }]}
              onPress={readPhoneClipboard}
            >
              <IconSymbol name="arrow.clockwise" size={16} color={colors.primary} />
            </Pressable>
          </View>
          <Text style={[styles.clipText, { color: colors.foreground, backgroundColor: colors.background }]} numberOfLines={4}>
            {phoneClipboard || (isRTL ? 'الحافظة فارغة' : 'Clipboard is empty')}
          </Text>
          <View style={styles.cardActions}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
              onPress={() => phoneClipboard && sendToPC(phoneClipboard)}
            >
              <IconSymbol name="desktopcomputer" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>{isRTL ? 'إرسال للحاسوب' : 'Send to PC'}</Text>
            </Pressable>
          </View>
        </View>

        {/* PC Clipboard */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <IconSymbol name="desktopcomputer" size={18} color='#7C3AED' />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {isRTL ? 'حافظة الحاسوب' : 'PC Clipboard'}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.refreshBtn, { backgroundColor: '#7C3AED20' }, pressed && { opacity: 0.7 }]}
              onPress={requestPcClipboard}
            >
              <IconSymbol name="arrow.clockwise" size={16} color='#7C3AED' />
            </Pressable>
          </View>
          <Text style={[styles.clipText, { color: colors.foreground, backgroundColor: colors.background }]} numberOfLines={4}>
            {pcClipboard || (isRTL ? 'الحافظة فارغة' : 'Clipboard is empty')}
          </Text>
          <View style={styles.cardActions}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: '#7C3AED' }, pressed && { opacity: 0.85 }]}
              onPress={() => pcClipboard && copyToPhone(pcClipboard)}
            >
              <IconSymbol name="iphone" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>{isRTL ? 'نسخ للهاتف' : 'Copy to Phone'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Send Custom Text */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 10 }]}>
            {isRTL ? 'إرسال نص مخصص' : 'Send Custom Text'}
          </Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
            placeholder={isRTL ? 'اكتب نصاً للإرسال...' : 'Type text to send...'}
            placeholderTextColor={colors.muted}
            value={customText}
            onChangeText={setCustomText}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.cardActions}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.primary, flex: 1 }, pressed && { opacity: 0.85 }]}
              onPress={() => {
                if (customText.trim()) {
                  sendToPC(customText.trim());
                  setCustomText('');
                }
              }}
            >
              <IconSymbol name="paperplane.fill" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>{isRTL ? 'إرسال' : 'Send'}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, pressed && { opacity: 0.85 }]}
              onPress={async () => {
                if (customText.trim()) {
                  await Clipboard.setStringAsync(customText.trim());
                  setPhoneClipboard(customText.trim());
                  setCustomText('');
                }
              }}
            >
              <IconSymbol name="doc.on.doc" size={16} color={colors.foreground} />
              <Text style={[styles.actionBtnText, { color: colors.foreground }]}>{isRTL ? 'نسخ' : 'Copy'}</Text>
            </Pressable>
          </View>
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {isRTL ? 'السجل' : 'History'}
              </Text>
              <Pressable onPress={() => setHistory([])} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <Text style={[{ color: colors.error, fontSize: 13 }]}>{isRTL ? 'مسح' : 'Clear'}</Text>
              </Pressable>
            </View>
            {history.map(entry => (
              <Pressable
                key={entry.id}
                style={({ pressed }) => [
                  styles.historyItem,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={() => copyToPhone(entry.text)}
              >
                <View style={[styles.sourceTag, { backgroundColor: entry.source === 'phone' ? colors.primary + '20' : '#7C3AED20' }]}>
                  <IconSymbol name={entry.source === 'phone' ? 'iphone' : 'desktopcomputer'} size={12} color={entry.source === 'phone' ? colors.primary : '#7C3AED'} />
                </View>
                <Text style={[styles.historyText, { color: colors.foreground }]} numberOfLines={2}>{entry.text}</Text>
                <Text style={[styles.historyTime, { color: colors.muted }]}>{formatTime(entry.timestamp)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  autoSyncBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  autoSyncText: { fontSize: 12, fontWeight: '600' },
  card: { margin: 16, marginBottom: 0, borderRadius: 16, padding: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  refreshBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  clipText: { borderRadius: 10, padding: 12, fontSize: 14, lineHeight: 20, minHeight: 60 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  textInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 14, minHeight: 80 },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 8 },
  sourceTag: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  historyText: { flex: 1, fontSize: 13 },
  historyTime: { fontSize: 11 },
});
