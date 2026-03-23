import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert
} from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

const SPECIAL_KEYS = [
  { label: 'Esc', key: 'escape' }, { label: 'Tab', key: 'tab' }, { label: 'Caps', key: 'capslock' },
  { label: 'Win', key: 'win' }, { label: 'Del', key: 'delete' }, { label: 'Ins', key: 'insert' },
  { label: 'Home', key: 'home' }, { label: 'End', key: 'end' }, { label: 'PgUp', key: 'pageup' },
  { label: 'PgDn', key: 'pagedown' }, { label: '↑', key: 'up' }, { label: '↓', key: 'down' },
  { label: '←', key: 'left' }, { label: '→', key: 'right' }, { label: 'Enter', key: 'enter' },
  { label: 'Bksp', key: 'backspace' }, { label: 'Space', key: 'space' }, { label: 'PrtSc', key: 'printscreen' },
];

const FUNCTION_KEYS = ['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];

const SHORTCUTS = [
  { label: 'Ctrl+C', keys: ['ctrl', 'c'], desc: 'Copy' },
  { label: 'Ctrl+V', keys: ['ctrl', 'v'], desc: 'Paste' },
  { label: 'Ctrl+X', keys: ['ctrl', 'x'], desc: 'Cut' },
  { label: 'Ctrl+Z', keys: ['ctrl', 'z'], desc: 'Undo' },
  { label: 'Ctrl+Y', keys: ['ctrl', 'y'], desc: 'Redo' },
  { label: 'Ctrl+A', keys: ['ctrl', 'a'], desc: 'Select All' },
  { label: 'Ctrl+S', keys: ['ctrl', 's'], desc: 'Save' },
  { label: 'Alt+F4', keys: ['alt', 'f4'], desc: 'Close App' },
  { label: 'Win+D', keys: ['win', 'd'], desc: 'Desktop' },
  { label: 'Win+L', keys: ['win', 'l'], desc: 'Lock' },
  { label: 'Ctrl+Alt+Del', keys: ['ctrl', 'alt', 'delete'], desc: 'Task Mgr' },
  { label: 'Alt+Tab', keys: ['alt', 'tab'], desc: 'Switch App' },
];

export default function KeyboardControlScreen() {
  const colors = useColors();
  const { t, language } = useI18n();
  const { sendMessage, status } = useConnection();
  const [textInput, setTextInput] = useState('');
  const [activeTab, setActiveTab] = useState<'type' | 'special' | 'shortcuts' | 'fn'>('type');
  const isConnected = status === 'connected';

  const sendKey = (key: string) => {
    if (!isConnected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage('key_press', { key });
  };

  const sendCombo = (keys: string[]) => {
    if (!isConnected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sendMessage('key_combo', { keys });
  };

  const sendText = () => {
    if (!isConnected || !textInput.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage('type_text', { text: textInput });
    setTextInput('');
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {language === 'ar' ? 'لوحة المفاتيح' : 'Keyboard'}
        </Text>
        <View style={[styles.connBadge, { backgroundColor: isConnected ? colors.success + '20' : colors.error + '20' }]}>
          <View style={[styles.connDot, { backgroundColor: isConnected ? colors.success : colors.error }]} />
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['type', 'special', 'shortcuts', 'fn'] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.muted }]}>
              {tab === 'type' ? (language === 'ar' ? 'كتابة' : 'Type')
                : tab === 'special' ? (language === 'ar' ? 'خاصة' : 'Special')
                : tab === 'shortcuts' ? (language === 'ar' ? 'اختصارات' : 'Shortcuts')
                : 'F1-F12'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {activeTab === 'type' && (
          <View style={{ gap: 12 }}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>
              {language === 'ar' ? 'اكتب نصاً وأرسله للحاسوب' : 'Type text and send to PC'}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              placeholder={language === 'ar' ? 'اكتب هنا...' : 'Type here...'}
              placeholderTextColor={colors.muted}
              value={textInput}
              onChangeText={setTextInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Pressable
              style={({ pressed }) => [styles.sendBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
              onPress={sendText}
            >
              <IconSymbol name="paperplane.fill" size={18} color="#fff" />
              <Text style={styles.sendBtnText}>{language === 'ar' ? 'إرسال للحاسوب' : 'Send to PC'}</Text>
            </Pressable>

            {/* Quick Type Keys */}
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>
              {language === 'ar' ? 'مفاتيح سريعة' : 'Quick Keys'}
            </Text>
            <View style={styles.quickKeys}>
              {['Enter', 'Tab', 'Backspace', 'Space', 'Escape'].map((key) => (
                <Pressable
                  key={key}
                  style={({ pressed }) => [styles.quickKey, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { transform: [{ scale: 0.95 }] }]}
                  onPress={() => sendKey(key.toLowerCase())}
                >
                  <Text style={[styles.quickKeyText, { color: colors.foreground }]}>{key}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'special' && (
          <View>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>
              {language === 'ar' ? 'المفاتيح الخاصة' : 'Special Keys'}
            </Text>
            <View style={styles.keysGrid}>
              {SPECIAL_KEYS.map((item) => (
                <Pressable
                  key={item.key}
                  style={({ pressed }) => [styles.keyBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { transform: [{ scale: 0.93 }], backgroundColor: colors.primary + '20' }]}
                  onPress={() => sendKey(item.key)}
                >
                  <Text style={[styles.keyBtnText, { color: colors.foreground }]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'shortcuts' && (
          <View>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>
              {language === 'ar' ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
            </Text>
            <View style={styles.shortcutsGrid}>
              {SHORTCUTS.map((sc) => (
                <Pressable
                  key={sc.label}
                  style={({ pressed }) => [styles.shortcutBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { transform: [{ scale: 0.95 }], backgroundColor: colors.primary + '15' }]}
                  onPress={() => sendCombo(sc.keys)}
                >
                  <Text style={[styles.shortcutLabel, { color: colors.primary }]}>{sc.label}</Text>
                  <Text style={[styles.shortcutDesc, { color: colors.muted }]}>{sc.desc}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'fn' && (
          <View>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>
              {language === 'ar' ? 'مفاتيح الوظائف' : 'Function Keys'}
            </Text>
            <View style={styles.fnGrid}>
              {FUNCTION_KEYS.map((key) => (
                <Pressable
                  key={key}
                  style={({ pressed }) => [styles.fnBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { transform: [{ scale: 0.93 }], backgroundColor: '#1D4ED820' }]}
                  onPress={() => sendKey(key.toLowerCase())}
                >
                  <Text style={[styles.fnBtnText, { color: colors.foreground }]}>{key}</Text>
                </Pressable>
              ))}
            </View>

            {/* Modifier Keys */}
            <Text style={[styles.sectionLabel, { color: colors.muted, marginTop: 16 }]}>
              {language === 'ar' ? 'مفاتيح التعديل' : 'Modifier Keys'}
            </Text>
            <View style={styles.modifierRow}>
              {['Ctrl', 'Alt', 'Shift', 'Win'].map((key) => (
                <Pressable
                  key={key}
                  style={({ pressed }) => [styles.modBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { transform: [{ scale: 0.95 }], backgroundColor: colors.primary + '20' }]}
                  onPress={() => sendKey(key.toLowerCase())}
                >
                  <Text style={[styles.modBtnText, { color: colors.foreground }]}>{key}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
  connBadge: { padding: 8, borderRadius: 20 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  quickKeys: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickKey: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  quickKeyText: { fontSize: 13, fontWeight: '500' },
  keysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  keyBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, minWidth: 60, alignItems: 'center' },
  keyBtnText: { fontSize: 13, fontWeight: '600' },
  shortcutsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shortcutBtn: { width: '47%', borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  shortcutLabel: { fontSize: 14, fontWeight: '700' },
  shortcutDesc: { fontSize: 11 },
  fnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fnBtn: { width: '22%', paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  fnBtnText: { fontSize: 14, fontWeight: '600' },
  modifierRow: { flexDirection: 'row', gap: 8 },
  modBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  modBtnText: { fontSize: 14, fontWeight: '600' },
});
