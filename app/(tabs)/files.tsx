import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

const FILE_ITEMS = [
  {
    id: 'manager',
    icon: 'folder.fill',
    labelEn: 'File Manager',
    labelAr: 'مدير الملفات',
    route: '/screens/file-manager',
    color: '#3B82F6',
    desc: 'Browse PC files and folders',
    descAr: 'تصفح ملفات ومجلدات الحاسوب',
    requiresConn: true,
  },
  {
    id: 'transfer',
    icon: 'tray.and.arrow.up',
    labelEn: 'File Transfer',
    labelAr: 'نقل الملفات',
    route: '/screens/file-transfer',
    color: '#EC4899',
    desc: 'Upload & download files fast',
    descAr: 'رفع وتنزيل الملفات بسرعة',
    requiresConn: true,
  },
  {
    id: 'print',
    icon: 'printer.fill',
    labelEn: 'Print Files',
    labelAr: 'طباعة الملفات',
    route: '/screens/file-manager',
    color: '#B45309',
    desc: 'Print files directly from phone',
    descAr: 'طباعة الملفات مباشرة من الهاتف',
    requiresConn: true,
  },
  {
    id: 'clipboard',
    icon: 'doc.on.doc',
    labelEn: 'Clipboard Sync',
    labelAr: 'مزامنة الحافظة',
    route: '/screens/clipboard-sync',
    color: '#8B5CF6',
    desc: 'Sync clipboard between phone & PC',
    descAr: 'مزامنة الحافظة بين الهاتف والحاسوب',
    requiresConn: true,
  },
];

const TOOLS_ITEMS = [
  {
    id: 'shortcuts',
    icon: 'bolt.fill',
    labelEn: 'Custom Shortcuts',
    labelAr: 'اختصارات مخصصة',
    route: '/screens/shortcuts',
    color: '#F59E0B',
    desc: 'Build your own macro buttons',
    descAr: 'أنشئ أزرار ماكرو مخصصة',
    requiresConn: false,
  },
  {
    id: 'scanner',
    icon: 'network',
    labelEn: 'Network Scanner',
    labelAr: 'فحص الشبكة',
    route: '/screens/network-scanner',
    color: '#10B981',
    desc: 'Auto-discover PCs on your network',
    descAr: 'اكتشاف الحواسيب تلقائياً على شبكتك',
    requiresConn: false,
  },
  {
    id: 'pin',
    icon: 'shield.fill',
    labelEn: 'Security & PIN',
    labelAr: 'الأمان والرمز السري',
    route: '/screens/pin-lock',
    color: '#EF4444',
    desc: 'Secure your connection with PIN',
    descAr: 'أمّن اتصالك برمز PIN',
    requiresConn: false,
  },
];

export default function FilesScreen() {
  const colors = useColors();
  const { language } = useI18n();
  const { status } = useConnection();
  const isConnected = status === 'connected';

  const handleNav = (route: string, requiresConn: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (requiresConn && !isConnected) return;
    router.push(route as any);
  };

  const renderItem = (item: typeof FILE_ITEMS[0] & { requiresConn: boolean }, idx: number) => {
    const disabled = item.requiresConn && !isConnected;
    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && !disabled && { transform: [{ scale: 0.98 }], opacity: 0.9 },
          disabled && { opacity: 0.45 },
        ]}
        onPress={() => handleNav(item.route, item.requiresConn)}
      >
        <View style={[styles.iconBg, { backgroundColor: item.color + '20' }]}>
          <IconSymbol name={item.icon as any} size={26} color={item.color} />
        </View>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.itemTitle, { color: colors.foreground }]}>
            {language === 'ar' ? item.labelAr : item.labelEn}
          </Text>
          <Text style={[styles.itemDesc, { color: colors.muted }]}>
            {language === 'ar' ? item.descAr : item.desc}
          </Text>
        </View>
        {disabled ? (
          <IconSymbol name="lock.fill" size={16} color={colors.muted} />
        ) : (
          <IconSymbol name="chevron.right" size={18} color={colors.muted} />
        )}
      </Pressable>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {language === 'ar' ? 'الملفات والأدوات' : 'Files & Tools'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: isConnected ? colors.success + '20' : colors.error + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? colors.success : colors.error }]} />
          <Text style={[styles.statusText, { color: isConnected ? colors.success : colors.error }]}>
            {isConnected ? (language === 'ar' ? 'متصل' : 'Connected') : (language === 'ar' ? 'غير متصل' : 'Offline')}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        {/* File Operations */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>
          {language === 'ar' ? 'عمليات الملفات' : 'FILE OPERATIONS'}
        </Text>
        <View style={styles.section}>
          {FILE_ITEMS.map((item, idx) => renderItem(item, idx))}
        </View>

        {/* Tools */}
        <Text style={[styles.sectionLabel, { color: colors.muted, marginTop: 20 }]}>
          {language === 'ar' ? 'الأدوات' : 'TOOLS'}
        </Text>
        <View style={styles.section}>
          {TOOLS_ITEMS.map((item, idx) => renderItem(item, idx))}
        </View>

        {!isConnected && (
          <View style={[styles.notice, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
            <IconSymbol name="exclamationmark.triangle" size={20} color={colors.warning} />
            <Text style={[styles.noticeText, { color: colors.warning }]}>
              {language === 'ar' ? 'بعض الميزات تتطلب الاتصال بالحاسوب أولاً' : 'Some features require PC connection first'}
            </Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  section: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  iconBg: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemDesc: { fontSize: 12, marginTop: 2 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 20 },
  noticeText: { fontSize: 13, fontWeight: '500', flex: 1 },
});
