import React, { useState, useEffect } from 'react';
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

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: string;
  extension?: string;
}

const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  pdf: { icon: 'doc.fill', color: '#EF4444' },
  doc: { icon: 'doc.text', color: '#3B82F6' },
  docx: { icon: 'doc.text', color: '#3B82F6' },
  xls: { icon: 'doc.fill', color: '#10B981' },
  xlsx: { icon: 'doc.fill', color: '#10B981' },
  ppt: { icon: 'doc.fill', color: '#F59E0B' },
  pptx: { icon: 'doc.fill', color: '#F59E0B' },
  jpg: { icon: 'photo', color: '#7C3AED' },
  jpeg: { icon: 'photo', color: '#7C3AED' },
  png: { icon: 'photo', color: '#7C3AED' },
  mp4: { icon: 'video', color: '#EC4899' },
  mp3: { icon: 'waveform', color: '#0891B2' },
  zip: { icon: 'doc.fill', color: '#6B7280' },
  exe: { icon: 'bolt.fill', color: '#F59E0B' },
  txt: { icon: 'doc.text', color: '#94A3B8' },
};

export default function FileManagerScreen() {
  const colors = useColors();
  const { t, language } = useI18n();
  const { sendMessage, status, ws } = useConnection();
  const [currentPath, setCurrentPath] = useState('C:\\');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const isConnected = status === 'connected';

  useEffect(() => {
    if (isConnected && ws) {
      const handler = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'file_list') {
            setFiles(msg.data || []);
            setLoading(false);
          }
        } catch {}
      };
      ws.addEventListener('message', handler);
      loadPath('C:\\');
      return () => ws.removeEventListener('message', handler);
    }
  }, [isConnected, ws]);

  const loadPath = (path: string) => {
    setLoading(true);
    setCurrentPath(path);
    sendMessage('list_files', { path });
  };

  const navigateTo = (item: FileItem) => {
    if (item.type === 'folder') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPathHistory(prev => [...prev, currentPath]);
      loadPath(item.path);
    } else {
      showFileOptions(item);
    }
  };

  const goBack = () => {
    if (pathHistory.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const prev = pathHistory[pathHistory.length - 1];
      setPathHistory(h => h.slice(0, -1));
      loadPath(prev);
    }
  };

  const showFileOptions = (item: FileItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      item.name,
      `${formatSize(item.size || 0)}`,
      [
        { text: language === 'ar' ? 'فتح' : 'Open', onPress: () => sendMessage('open_file', { path: item.path }) },
        { text: language === 'ar' ? 'تنزيل' : 'Download', onPress: () => router.push({ pathname: '/screens/file-transfer' as any, params: { path: item.path, name: item.name } }) },
        { text: language === 'ar' ? 'طباعة' : 'Print', onPress: () => sendMessage('print_file', { path: item.path }) },
        { text: language === 'ar' ? 'حذف' : 'Delete', style: 'destructive', onPress: () => confirmDelete(item) },
        { text: language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
      ]
    );
  };

  const confirmDelete = (item: FileItem) => {
    Alert.alert(
      t('delete'),
      `${language === 'ar' ? 'حذف' : 'Delete'} "${item.name}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => {
          sendMessage('delete_file', { path: item.path });
          setFiles(prev => prev.filter(f => f.path !== item.path));
        }},
      ]
    );
  };

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'folder') return { icon: 'folder.fill', color: '#F59E0B' };
    const ext = item.extension?.toLowerCase() || '';
    return FILE_ICONS[ext] || { icon: 'doc', color: colors.muted };
  };

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: FileItem }) => {
    const { icon, color } = getFileIcon(item);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.fileRow,
          { borderBottomColor: colors.border },
          pressed && { backgroundColor: colors.primary + '10' }
        ]}
        onPress={() => navigateTo(item)}
        onLongPress={() => showFileOptions(item)}
      >
        <View style={[styles.fileIcon, { backgroundColor: color + '20' }]}>
          <IconSymbol name={icon as any} size={22} color={color} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.fileMeta, { color: colors.muted }]}>
            {item.type === 'folder' ? (language === 'ar' ? 'مجلد' : 'Folder') : formatSize(item.size || 0)}
            {item.modified ? ` • ${item.modified}` : ''}
          </Text>
        </View>
        <IconSymbol name={item.type === 'folder' ? 'chevron.right' : 'ellipsis'} size={16} color={colors.muted} />
      </Pressable>
    );
  };

  if (!isConnected) {
    return (
      <ScreenContainer>
        <View style={styles.emptyState}>
          <IconSymbol name="folder.fill" size={60} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('fileManagerTitle')}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>{t('connectionTitle')}</Text>
          <Pressable style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('back')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={pathHistory.length > 0 ? goBack : () => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('fileManagerTitle')}</Text>
          <Text style={[styles.currentPath, { color: colors.muted }]} numberOfLines={1}>{currentPath}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.refreshBtn, { backgroundColor: colors.primary + '20' }, pressed && { opacity: 0.7 }]}
          onPress={() => loadPath(currentPath)}
        >
          <IconSymbol name="arrow.clockwise" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder={language === 'ar' ? 'بحث في الملفات...' : 'Search files...'}
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Quick Access Drives */}
      <View style={[styles.drivesRow, { borderBottomColor: colors.border }]}>
        {['C:\\', 'D:\\', 'E:\\', 'Desktop', 'Downloads', 'Documents'].map((drive) => (
          <Pressable
            key={drive}
            style={({ pressed }) => [
              styles.driveBtn,
              { backgroundColor: currentPath === drive ? colors.primary + '20' : colors.surface, borderColor: currentPath === drive ? colors.primary : colors.border },
              pressed && { opacity: 0.8 }
            ]}
            onPress={() => loadPath(drive === 'Desktop' ? `C:\\Users\\Public\\Desktop` : drive === 'Downloads' ? `C:\\Users\\Public\\Downloads` : drive === 'Documents' ? `C:\\Users\\Public\\Documents` : drive)}
          >
            <Text style={[styles.driveBtnText, { color: currentPath.startsWith(drive.replace('\\', '')) ? colors.primary : colors.muted }]}>{drive}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            {language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFiles}
          keyExtractor={(item) => item.path}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyFolder}>
              <IconSymbol name="folder" size={40} color={colors.muted} />
              <Text style={[styles.emptyFolderText, { color: colors.muted }]}>
                {language === 'ar' ? 'المجلد فارغ' : 'Empty folder'}
              </Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  currentPath: { fontSize: 11, marginTop: 1 },
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
  drivesRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 0.5,
  },
  driveBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  driveBtnText: { fontSize: 11, fontWeight: '500' },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  fileIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 14, fontWeight: '500' },
  fileMeta: { fontSize: 11, marginTop: 2 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  emptySubtitle: { fontSize: 14 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyFolder: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyFolderText: { fontSize: 14 },
});
