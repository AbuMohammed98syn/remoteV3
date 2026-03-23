import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, FlatList, Alert
} from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

interface QuickCommand {
  id: string;
  label: string;
  labelAr: string;
  command: string;
  color: string;
  icon: string;
}

const QUICK_COMMANDS: QuickCommand[] = [
  { id: '1', label: 'System Info', labelAr: 'معلومات النظام', command: 'Get-ComputerInfo | Select-Object CsName, OsName, OsVersion, CsProcessors', color: '#00D4FF', icon: 'desktopcomputer' },
  { id: '2', label: 'Running Processes', labelAr: 'العمليات الجارية', command: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 20 | Format-Table Name, CPU, WorkingSet -AutoSize', color: '#7C3AED', icon: 'list.dash' },
  { id: '3', label: 'Disk Space', labelAr: 'مساحة القرص', command: 'Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free | Format-Table', color: '#F59E0B', icon: 'memorychip' },
  { id: '4', label: 'Network Info', labelAr: 'معلومات الشبكة', command: 'Get-NetIPAddress | Where-Object {$_.AddressFamily -eq "IPv4"} | Select-Object InterfaceAlias, IPAddress | Format-Table', color: '#10B981', icon: 'wifi' },
  { id: '5', label: 'IP Config', labelAr: 'إعدادات الشبكة', command: 'ipconfig /all', color: '#3B82F6', icon: 'network' },
  { id: '6', label: 'List Services', labelAr: 'قائمة الخدمات', command: 'Get-Service | Where-Object {$_.Status -eq "Running"} | Select-Object Name, DisplayName | Format-Table', color: '#EC4899', icon: 'bolt.fill' },
  { id: '7', label: 'Event Logs', labelAr: 'سجل الأحداث', command: 'Get-EventLog -LogName System -Newest 20 | Format-Table TimeGenerated, EntryType, Message -AutoSize', color: '#8B5CF6', icon: 'doc.text' },
  { id: '8', label: 'Installed Apps', labelAr: 'التطبيقات المثبتة', command: 'Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion | Sort-Object DisplayName | Format-Table', color: '#059669', icon: 'square.grid.2x2' },
  { id: '9', label: 'CPU Usage', labelAr: 'استخدام المعالج', command: 'Get-Counter "\\Processor(_Total)\\% Processor Time" | Select-Object -ExpandProperty CounterSamples | Select-Object CookedValue', color: '#DC2626', icon: 'cpu' },
  { id: '10', label: 'RAM Usage', labelAr: 'استخدام الذاكرة', command: '[System.Math]::Round((Get-WmiObject Win32_OperatingSystem).FreePhysicalMemory/1MB, 2)', color: '#7C3AED', icon: 'memorychip' },
  { id: '11', label: 'Firewall Status', labelAr: 'حالة الجدار الناري', command: 'Get-NetFirewallProfile | Select-Object Name, Enabled | Format-Table', color: '#EF4444', icon: 'shield.fill' },
  { id: '12', label: 'Open Ports', labelAr: 'المنافذ المفتوحة', command: 'netstat -an | findstr LISTENING', color: '#F59E0B', icon: 'network' },
  { id: '13', label: 'User Accounts', labelAr: 'حسابات المستخدمين', command: 'Get-LocalUser | Select-Object Name, Enabled, LastLogon | Format-Table', color: '#00D4FF', icon: 'person.fill' },
  { id: '14', label: 'Environment Vars', labelAr: 'متغيرات البيئة', command: 'Get-ChildItem Env: | Select-Object Name, Value | Format-Table', color: '#10B981', icon: 'list.bullet.rectangle' },
  { id: '15', label: 'Windows Updates', labelAr: 'تحديثات ويندوز', command: 'Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 10 | Format-Table HotFixID, InstalledOn, Description', color: '#3B82F6', icon: 'arrow.clockwise' },
  { id: '16', label: 'Startup Programs', labelAr: 'برامج بدء التشغيل', command: 'Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location | Format-Table', color: '#8B5CF6', icon: 'play.fill' },
  { id: '17', label: 'System Uptime', labelAr: 'وقت التشغيل', command: '(Get-Date) - (gcim Win32_OperatingSystem).LastBootUpTime', color: '#059669', icon: 'clock.fill' },
  { id: '18', label: 'WiFi Profiles', labelAr: 'شبكات WiFi المحفوظة', command: 'netsh wlan show profiles', color: '#0891B2', icon: 'wifi' },
  { id: '19', label: 'Ping Google', labelAr: 'اختبار الاتصال', command: 'Test-Connection -ComputerName google.com -Count 4', color: '#16A34A', icon: 'antenna.radiowaves.left.and.right' },
  { id: '20', label: 'Flush DNS', labelAr: 'مسح DNS', command: 'Clear-DnsClientCache; Write-Host "DNS Cache Cleared!"', color: '#DC2626', icon: 'trash.fill' },
];

export default function PowerShellScreen() {
  const colors = useColors();
  const { t, language } = useI18n();
  const { sendMessage, status, ws } = useConnection();
  const [output, setOutput] = useState<string>('');
  const [customCommand, setCustomCommand] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'custom'>('quick');
  const scrollRef = useRef<ScrollView>(null);
  const isConnected = status === 'connected';

  useEffect(() => {
    if (!ws) return;
    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'powershell_output') {
          setOutput(prev => prev + msg.data + '\n');
          setIsRunning(false);
          setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
        } else if (msg.type === 'powershell_error') {
          setOutput(prev => prev + `[ERROR] ${msg.data}\n`);
          setIsRunning(false);
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws]);

  const executeCommand = (cmd: string) => {
    if (!isConnected || isRunning) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(true);
    setOutput(prev => prev + `\nPS> ${cmd}\n`);
    sendMessage('powershell_exec', { command: cmd });
  };

  const handleCustomExec = () => {
    if (!customCommand.trim()) return;
    executeCommand(customCommand.trim());
    setCustomCommand('');
  };

  if (!isConnected) {
    return (
      <ScreenContainer>
        <View style={styles.emptyState}>
          <IconSymbol name="terminal.fill" size={60} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('powershellTitle')}</Text>
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
        <View style={[styles.psIconBg, { backgroundColor: '#1D4ED820' }]}>
          <Text style={styles.psIcon}>PS</Text>
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('powershellTitle')}</Text>
        <Pressable
          onPress={() => router.push('/screens/powershell-list' as any)}
          style={({ pressed }) => [styles.listBtn, { backgroundColor: colors.primary + '20' }, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.listBtnText, { color: colors.primary }]}>
            {language === 'ar' ? 'أهم 100' : 'Top 100'}
          </Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'quick' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('quick')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'quick' ? colors.primary : colors.muted }]}>
            {language === 'ar' ? '20 أمر سريع' : '20 Quick Commands'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'custom' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('custom')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'custom' ? colors.primary : colors.muted }]}>
            {language === 'ar' ? 'أمر مخصص' : 'Custom Command'}
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'quick' ? (
          <FlatList
            data={QUICK_COMMANDS}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={{ padding: 12, gap: 8 }}
            columnWrapperStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.cmdCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { transform: [{ scale: 0.96 }], backgroundColor: item.color + '15' }
                ]}
                onPress={() => executeCommand(item.command)}
              >
                <View style={[styles.cmdIconBg, { backgroundColor: item.color + '20' }]}>
                  <IconSymbol name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[styles.cmdLabel, { color: colors.foreground }]} numberOfLines={2}>
                  {language === 'ar' ? item.labelAr : item.label}
                </Text>
                <Text style={[styles.cmdPreview, { color: colors.muted }]} numberOfLines={1}>
                  {item.command.substring(0, 30)}...
                </Text>
              </Pressable>
            )}
          />
        ) : (
          <View style={{ flex: 1, padding: 12, gap: 10 }}>
            <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.prompt, { color: colors.primary }]}>PS&gt;</Text>
              <TextInput
                style={[styles.cmdInput, { color: colors.foreground }]}
                placeholder={language === 'ar' ? 'أدخل أمر باور شيل...' : 'Enter PowerShell command...'}
                placeholderTextColor={colors.muted}
                value={customCommand}
                onChangeText={setCustomCommand}
                onSubmitEditing={handleCustomExec}
                returnKeyType="send"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={({ pressed }) => [styles.execBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
                onPress={handleCustomExec}
                disabled={isRunning}
              >
                <IconSymbol name={isRunning ? 'stop.fill' : 'play.fill'} size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Output Panel */}
        {output.length > 0 && (
          <View style={[styles.outputPanel, { backgroundColor: '#0A0E1A', borderTopColor: colors.border }]}>
            <View style={styles.outputHeader}>
              <Text style={[styles.outputTitle, { color: colors.primary }]}>
                {language === 'ar' ? 'الناتج' : 'Output'}
              </Text>
              <Pressable onPress={() => setOutput('')} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <Text style={[styles.clearBtn, { color: colors.muted }]}>
                  {language === 'ar' ? 'مسح' : 'Clear'}
                </Text>
              </Pressable>
            </View>
            <ScrollView ref={scrollRef} style={styles.outputScroll}>
              <Text style={styles.outputText} selectable>{output}</Text>
            </ScrollView>
          </View>
        )}
      </View>
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
    gap: 10,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  psIconBg: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  psIcon: { color: '#1D4ED8', fontWeight: '800', fontSize: 12 },
  listBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  listBtnText: { fontSize: 12, fontWeight: '600' },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: '600' },
  cmdCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  cmdIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cmdLabel: { fontSize: 13, fontWeight: '600' },
  cmdPreview: { fontSize: 10, fontFamily: 'monospace' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  prompt: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  cmdInput: { flex: 1, fontSize: 13, fontFamily: 'monospace' },
  execBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  outputPanel: {
    height: 200,
    borderTopWidth: 0.5,
  },
  outputHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  outputTitle: { fontSize: 12, fontWeight: '600', fontFamily: 'monospace' },
  clearBtn: { fontSize: 12 },
  outputScroll: { flex: 1, paddingHorizontal: 12 },
  outputText: { color: '#00FF41', fontFamily: 'monospace', fontSize: 11, lineHeight: 18 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});
