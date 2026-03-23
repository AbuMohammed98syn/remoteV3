import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  Modal, FlatList, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';

interface Shortcut {
  id: string;
  name: string;
  nameAr: string;
  command: string;
  type: 'powershell' | 'hotkey' | 'launch' | 'macro';
  icon: string;
  color: string;
  category: string;
}

const PRESET_SHORTCUTS: Shortcut[] = [
  // System
  { id: 'p1', name: 'Task Manager', nameAr: 'مدير المهام', command: 'taskmgr', type: 'launch', icon: 'rectangle.3.group', color: '#DC2626', category: 'System' },
  { id: 'p2', name: 'Control Panel', nameAr: 'لوحة التحكم', command: 'control', type: 'launch', icon: 'gear', color: '#6B7280', category: 'System' },
  { id: 'p3', name: 'Device Manager', nameAr: 'إدارة الأجهزة', command: 'devmgmt.msc', type: 'launch', icon: 'cpu', color: '#7C3AED', category: 'System' },
  { id: 'p4', name: 'Registry Editor', nameAr: 'محرر السجل', command: 'regedit', type: 'launch', icon: 'list.bullet.rectangle', color: '#B45309', category: 'System' },
  // Hotkeys
  { id: 'h1', name: 'Win+D (Desktop)', nameAr: 'Win+D (سطح المكتب)', command: 'win+d', type: 'hotkey', icon: 'display', color: '#0891B2', category: 'Hotkeys' },
  { id: 'h2', name: 'Win+L (Lock)', nameAr: 'Win+L (قفل)', command: 'win+l', type: 'hotkey', icon: 'lock.fill', color: '#EF4444', category: 'Hotkeys' },
  { id: 'h3', name: 'Alt+F4 (Close)', nameAr: 'Alt+F4 (إغلاق)', command: 'alt+f4', type: 'hotkey', icon: 'xmark.circle.fill', color: '#DC2626', category: 'Hotkeys' },
  { id: 'h4', name: 'Ctrl+Alt+Del', nameAr: 'Ctrl+Alt+Del', command: 'ctrl+alt+del', type: 'hotkey', icon: 'exclamationmark.triangle', color: '#F59E0B', category: 'Hotkeys' },
  { id: 'h5', name: 'Win+Tab (View)', nameAr: 'Win+Tab (عرض)', command: 'win+tab', type: 'hotkey', icon: 'rectangle.grid.2x2', color: '#10B981', category: 'Hotkeys' },
  { id: 'h6', name: 'Print Screen', nameAr: 'لقطة شاشة', command: 'printscreen', type: 'hotkey', icon: 'camera.fill', color: '#8B5CF6', category: 'Hotkeys' },
  // Media
  { id: 'm1', name: 'Play/Pause', nameAr: 'تشغيل/إيقاف', command: 'media_play_pause', type: 'hotkey', icon: 'play.fill', color: '#16A34A', category: 'Media' },
  { id: 'm2', name: 'Volume Up', nameAr: 'رفع الصوت', command: 'volume_up', type: 'hotkey', icon: 'speaker.wave.2', color: '#0891B2', category: 'Media' },
  { id: 'm3', name: 'Volume Down', nameAr: 'خفض الصوت', command: 'volume_down', type: 'hotkey', icon: 'speaker.slash', color: '#6B7280', category: 'Media' },
  { id: 'm4', name: 'Mute', nameAr: 'كتم الصوت', command: 'volume_mute', type: 'hotkey', icon: 'mic.slash.fill', color: '#DC2626', category: 'Media' },
  // Apps
  { id: 'a1', name: 'Notepad', nameAr: 'المفكرة', command: 'notepad', type: 'launch', icon: 'doc.text', color: '#F59E0B', category: 'Apps' },
  { id: 'a2', name: 'Calculator', nameAr: 'الآلة الحاسبة', command: 'calc', type: 'launch', icon: 'plus', color: '#10B981', category: 'Apps' },
  { id: 'a3', name: 'File Explorer', nameAr: 'مستكشف الملفات', command: 'explorer', type: 'launch', icon: 'folder.fill', color: '#F59E0B', category: 'Apps' },
  { id: 'a4', name: 'Browser', nameAr: 'المتصفح', command: 'start chrome', type: 'launch', icon: 'globe', color: '#4285F4', category: 'Apps' },
];

const CATEGORIES = ['All', 'System', 'Hotkeys', 'Media', 'Apps', 'Custom'];
const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#0891B2', '#7C3AED', '#EC4899', '#1D4ED8', '#DC2626'];

export default function ShortcutsScreen() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const { sendMessage } = useConnection();
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(PRESET_SHORTCUTS);
  const [customShortcuts, setCustomShortcuts] = useState<Shortcut[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newType, setNewType] = useState<Shortcut['type']>('powershell');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [executing, setExecuting] = useState<string | null>(null);

  useEffect(() => {
    loadCustomShortcuts();
  }, []);

  const loadCustomShortcuts = async () => {
    const data = await AsyncStorage.getItem('custom_shortcuts');
    if (data) setCustomShortcuts(JSON.parse(data));
  };

  const saveCustomShortcuts = async (list: Shortcut[]) => {
    setCustomShortcuts(list);
    await AsyncStorage.setItem('custom_shortcuts', JSON.stringify(list));
  };

  const executeShortcut = async (shortcut: Shortcut) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExecuting(shortcut.id);

    let msgType = 'execute_command';
    let data: any = { command: shortcut.command };

    if (shortcut.type === 'hotkey') {
      msgType = 'send_hotkey';
      data = { keys: shortcut.command };
    } else if (shortcut.type === 'launch') {
      msgType = 'launch_app';
      data = { app: shortcut.command };
    } else if (shortcut.type === 'powershell') {
      msgType = 'run_powershell';
      data = { command: shortcut.command };
    }

    sendMessage(msgType, data);
    setTimeout(() => setExecuting(null), 800);
  };

  const addCustomShortcut = () => {
    if (!newName.trim() || !newCommand.trim()) return;
    const newShortcut: Shortcut = {
      id: `custom_${Date.now()}`,
      name: newName.trim(),
      nameAr: newName.trim(),
      command: newCommand.trim(),
      type: newType,
      icon: 'bolt.fill',
      color: newColor,
      category: 'Custom',
    };
    const updated = [...customShortcuts, newShortcut];
    saveCustomShortcuts(updated);
    setShowAddModal(false);
    setNewName('');
    setNewCommand('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteCustomShortcut = (id: string) => {
    Alert.alert(
      isRTL ? 'حذف الاختصار' : 'Delete Shortcut',
      isRTL ? 'هل تريد حذف هذا الاختصار؟' : 'Delete this shortcut?',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'حذف' : 'Delete',
          style: 'destructive',
          onPress: () => saveCustomShortcuts(customShortcuts.filter(s => s.id !== id))
        }
      ]
    );
  };

  const allShortcuts = [...shortcuts, ...customShortcuts];
  const filtered = selectedCategory === 'All'
    ? allShortcuts
    : allShortcuts.filter(s => s.category === selectedCategory);

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name={isRTL ? 'chevron.right' : 'chevron.left'} size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isRTL ? 'الاختصارات السريعة' : 'Quick Shortcuts'}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
          onPress={() => setShowAddModal(true)}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat}
            style={[
              styles.categoryChip,
              {
                backgroundColor: selectedCategory === cat ? colors.primary : colors.surface,
                borderColor: selectedCategory === cat ? colors.primary : colors.border,
              }
            ]}
            onPress={() => { setSelectedCategory(cat); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[styles.categoryText, { color: selectedCategory === cat ? '#fff' : colors.muted }]}>
              {isRTL ? (cat === 'All' ? 'الكل' : cat === 'System' ? 'النظام' : cat === 'Hotkeys' ? 'اختصارات' : cat === 'Media' ? 'وسائط' : cat === 'Apps' ? 'تطبيقات' : 'مخصص') : cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Shortcuts Grid */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={styles.grid}>
          {filtered.map(shortcut => (
            <Pressable
              key={shortcut.id}
              style={({ pressed }) => [
                styles.shortcutCard,
                { backgroundColor: colors.surface, borderColor: executing === shortcut.id ? shortcut.color : colors.border },
                pressed && { transform: [{ scale: 0.95 }] }
              ]}
              onPress={() => executeShortcut(shortcut)}
              onLongPress={() => shortcut.category === 'Custom' && deleteCustomShortcut(shortcut.id)}
            >
              <View style={[styles.shortcutIcon, { backgroundColor: shortcut.color + '20' }]}>
                <IconSymbol name={shortcut.icon as any} size={24} color={shortcut.color} />
              </View>
              <Text style={[styles.shortcutName, { color: colors.foreground }]} numberOfLines={2}>
                {isRTL ? shortcut.nameAr : shortcut.name}
              </Text>
              <View style={[styles.typeTag, { backgroundColor: colors.background }]}>
                <Text style={[styles.typeText, { color: colors.muted }]}>{shortcut.type}</Text>
              </View>
              {executing === shortcut.id && (
                <View style={[styles.executingOverlay, { backgroundColor: shortcut.color + '30' }]}>
                  <IconSymbol name="checkmark.circle.fill" size={28} color={shortcut.color} />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Add Shortcut Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {isRTL ? 'إضافة اختصار مخصص' : 'Add Custom Shortcut'}
              </Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={[styles.label, { color: colors.muted }]}>{isRTL ? 'الاسم' : 'Name'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                placeholder={isRTL ? 'اسم الاختصار' : 'Shortcut name'}
                placeholderTextColor={colors.muted}
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={[styles.label, { color: colors.muted }]}>{isRTL ? 'النوع' : 'Type'}</Text>
              <View style={styles.typeRow}>
                {(['powershell', 'hotkey', 'launch', 'macro'] as const).map(type => (
                  <Pressable
                    key={type}
                    style={[styles.typeBtn, { backgroundColor: newType === type ? colors.primary : colors.background, borderColor: colors.border }]}
                    onPress={() => setNewType(type)}
                  >
                    <Text style={[styles.typeBtnText, { color: newType === type ? '#fff' : colors.muted }]}>{type}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.muted }]}>{isRTL ? 'الأمر' : 'Command'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                placeholder={newType === 'hotkey' ? 'ctrl+c' : newType === 'launch' ? 'notepad' : 'Get-Process'}
                placeholderTextColor={colors.muted}
                value={newCommand}
                onChangeText={setNewCommand}
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: colors.muted }]}>{isRTL ? 'اللون' : 'Color'}</Text>
              <View style={styles.colorRow}>
                {COLORS.map(c => (
                  <Pressable
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c, borderWidth: newColor === c ? 3 : 0, borderColor: colors.foreground }]}
                    onPress={() => setNewColor(c)}
                  />
                ))}
              </View>

              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={addCustomShortcut}
              >
                <Text style={styles.saveBtnText}>{isRTL ? 'حفظ الاختصار' : 'Save Shortcut'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryScroll: { maxHeight: 52, paddingVertical: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  categoryText: { fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  shortcutCard: { width: '47%', borderRadius: 16, padding: 14, borderWidth: 1, overflow: 'hidden' },
  shortcutIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  shortcutName: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  typeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  typeText: { fontSize: 10, fontWeight: '500' },
  executingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 14 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  typeBtnText: { fontSize: 12, fontWeight: '600' },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
