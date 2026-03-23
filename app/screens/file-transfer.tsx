import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList,
  Alert, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

interface TransferItem {
  id: string;
  name: string;
  size: number;
  direction: 'upload' | 'download';
  progress: number;
  status: 'pending' | 'transferring' | 'done' | 'error';
  speed?: number;
}

export default function FileTransferScreen() {
  const colors = useColors();
  const { t, language } = useI18n();
  const { sendMessage, status, ws } = useConnection();
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'download'>('upload');
  const isConnected = status === 'connected';

  useEffect(() => {
    if (!ws) return;
    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'transfer_progress') {
          setTransfers(prev => prev.map(t =>
            t.id === msg.data.id
              ? { ...t, progress: msg.data.progress, speed: msg.data.speed, status: msg.data.progress >= 100 ? 'done' : 'transferring' }
              : t
          ));
        } else if (msg.type === 'transfer_error') {
          setTransfers(prev => prev.map(t =>
            t.id === msg.data.id ? { ...t, status: 'error' } : t
          ));
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws]);

  const handleUpload = async () => {
    if (!isConnected) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true });
      if (result.canceled) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      for (const asset of result.assets) {
        const id = Date.now().toString() + Math.random();
        const newTransfer: TransferItem = {
          id,
          name: asset.name,
          size: asset.size || 0,
          direction: 'upload',
          progress: 0,
          status: 'pending',
        };
        setTransfers(prev => [newTransfer, ...prev]);
        sendMessage('upload_file', {
          id,
          name: asset.name,
          size: asset.size,
          uri: asset.uri,
        });
      }
    } catch (e) {
      Alert.alert(t('error'), 'Failed to pick file');
    }
  };

  const handleDownloadRequest = () => {
    if (!isConnected) return;
    Alert.prompt(
      language === 'ar' ? 'مسار الملف' : 'File Path',
      language === 'ar' ? 'أدخل مسار الملف على الحاسوب' : 'Enter PC file path',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: language === 'ar' ? 'تنزيل' : 'Download',
          onPress: (path: string | undefined) => {
            if (!path) return;
            const id = Date.now().toString();
            const name = path.split('\\').pop() || path.split('/').pop() || 'file';
            const newTransfer: TransferItem = {
              id,
              name,
              size: 0,
              direction: 'download',
              progress: 0,
              status: 'pending',
            };
            setTransfers(prev => [newTransfer, ...prev]);
            sendMessage('download_file', { id, path });
          }
        }
      ],
      'plain-text',
      'C:\\Users\\Public\\Desktop\\'
    );
  };

  const clearCompleted = () => {
    setTransfers(prev => prev.filter(t => t.status !== 'done'));
  };

  const renderTransfer = ({ item }: { item: TransferItem }) => {
    const isUpload = item.direction === 'upload';
    const statusColor = item.status === 'done' ? colors.success : item.status === 'error' ? colors.error : colors.primary;

    return (
      <View style={[styles.transferCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <View style={[styles.transferIcon, { backgroundColor: isUpload ? '#EC489920' : '#3B82F620' }]}>
            <IconSymbol name={isUpload ? 'tray.and.arrow.up' : 'tray.and.arrow.down'} size={20} color={isUpload ? '#EC4899' : '#3B82F6'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.transferName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.transferMeta, { color: colors.muted }]}>
              {formatSize(item.size)}
              {item.speed ? ` • ${formatSize(item.speed)}/s` : ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status === 'done' ? (language === 'ar' ? 'مكتمل' : 'Done')
                : item.status === 'error' ? (language === 'ar' ? 'خطأ' : 'Error')
                : item.status === 'transferring' ? `${Math.round(item.progress)}%`
                : (language === 'ar' ? 'انتظار' : 'Pending')}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <View style={[
            styles.progressFill,
            {
              width: `${item.progress}%` as any,
              backgroundColor: statusColor
            }
          ]} />
        </View>
      </View>
    );
  };

  if (!isConnected) {
    return (
      <ScreenContainer>
        <View style={styles.emptyState}>
          <IconSymbol name="tray.and.arrow.up" size={60} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('fileTransferTitle')}</Text>
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
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('fileTransferTitle')}</Text>
        {transfers.some(t => t.status === 'done') && (
          <Pressable onPress={clearCompleted} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Text style={[styles.clearText, { color: colors.muted }]}>
              {language === 'ar' ? 'مسح المكتملة' : 'Clear Done'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: '#EC489920', borderColor: '#EC4899' }, pressed && { opacity: 0.85 }]}
          onPress={handleUpload}
        >
          <IconSymbol name="tray.and.arrow.up" size={22} color="#EC4899" />
          <Text style={[styles.actionBtnText, { color: '#EC4899' }]}>
            {language === 'ar' ? 'رفع من الهاتف' : 'Upload from Phone'}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: '#3B82F620', borderColor: '#3B82F6' }, pressed && { opacity: 0.85 }]}
          onPress={handleDownloadRequest}
        >
          <IconSymbol name="tray.and.arrow.down" size={22} color="#3B82F6" />
          <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>
            {language === 'ar' ? 'تنزيل من الحاسوب' : 'Download from PC'}
          </Text>
        </Pressable>
      </View>

      {transfers.length === 0 ? (
        <View style={styles.emptyTransfers}>
          <IconSymbol name="arrow.up.arrow.down" size={50} color={colors.muted} />
          <Text style={[styles.emptyTransfersText, { color: colors.muted }]}>
            {language === 'ar' ? 'لا توجد عمليات نقل' : 'No transfers yet'}
          </Text>
          <Text style={[styles.emptyTransfersHint, { color: colors.muted }]}>
            {language === 'ar' ? 'اضغط على الأزرار أعلاه لبدء النقل' : 'Tap buttons above to start'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={transfers}
          keyExtractor={(item) => item.id}
          renderItem={renderTransfer}
          contentContainerStyle={{ padding: 16, gap: 10 }}
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
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  clearText: { fontSize: 13 },
  actionRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    borderBottomWidth: 0.5,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  transferCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  transferIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  transferName: { fontSize: 14, fontWeight: '500' },
  transferMeta: { fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  progressBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  emptySubtitle: { fontSize: 14 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyTransfers: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTransfersText: { fontSize: 16, fontWeight: '500' },
  emptyTransfersHint: { fontSize: 13 },
});
