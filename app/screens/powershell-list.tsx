import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList, TextInput
} from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import * as Haptics from 'expo-haptics';

interface PSCommand {
  id: number;
  category: string;
  command: string;
  description: string;
  descriptionAr: string;
}

const PS_COMMANDS: PSCommand[] = [
  // System Info
  { id: 1, category: 'System', command: 'Get-ComputerInfo', description: 'Get detailed computer information', descriptionAr: 'معلومات الحاسوب التفصيلية' },
  { id: 2, category: 'System', command: 'systeminfo', description: 'Display system configuration', descriptionAr: 'عرض إعدادات النظام' },
  { id: 3, category: 'System', command: 'winver', description: 'Show Windows version', descriptionAr: 'عرض إصدار ويندوز' },
  { id: 4, category: 'System', command: 'Get-WmiObject Win32_BIOS', description: 'Get BIOS information', descriptionAr: 'معلومات البايوس' },
  { id: 5, category: 'System', command: 'Get-WmiObject Win32_Processor', description: 'Get CPU details', descriptionAr: 'تفاصيل المعالج' },
  // Process Management
  { id: 6, category: 'Process', command: 'Get-Process', description: 'List all running processes', descriptionAr: 'قائمة العمليات الجارية' },
  { id: 7, category: 'Process', command: 'Stop-Process -Name "notepad"', description: 'Kill process by name', descriptionAr: 'إنهاء عملية بالاسم' },
  { id: 8, category: 'Process', command: 'Start-Process notepad', description: 'Start a new process', descriptionAr: 'بدء عملية جديدة' },
  { id: 9, category: 'Process', command: 'Get-Process | Sort-Object CPU -Desc | Select -First 10', description: 'Top 10 CPU processes', descriptionAr: 'أعلى 10 عمليات CPU' },
  { id: 10, category: 'Process', command: 'tasklist /v', description: 'Verbose task list', descriptionAr: 'قائمة المهام التفصيلية' },
  // Network
  { id: 11, category: 'Network', command: 'ipconfig /all', description: 'Show all network config', descriptionAr: 'إعدادات الشبكة الكاملة' },
  { id: 12, category: 'Network', command: 'netstat -an', description: 'Show all network connections', descriptionAr: 'جميع اتصالات الشبكة' },
  { id: 13, category: 'Network', command: 'ping google.com -t', description: 'Continuous ping test', descriptionAr: 'اختبار اتصال مستمر' },
  { id: 14, category: 'Network', command: 'tracert google.com', description: 'Trace network route', descriptionAr: 'تتبع مسار الشبكة' },
  { id: 15, category: 'Network', command: 'nslookup google.com', description: 'DNS lookup', descriptionAr: 'بحث DNS' },
  { id: 16, category: 'Network', command: 'Get-NetAdapter', description: 'List network adapters', descriptionAr: 'قائمة محولات الشبكة' },
  { id: 17, category: 'Network', command: 'Clear-DnsClientCache', description: 'Flush DNS cache', descriptionAr: 'مسح ذاكرة DNS' },
  { id: 18, category: 'Network', command: 'netsh wlan show profiles', description: 'Show saved WiFi profiles', descriptionAr: 'شبكات WiFi المحفوظة' },
  { id: 19, category: 'Network', command: 'Test-NetConnection -ComputerName google.com -Port 443', description: 'Test TCP connection', descriptionAr: 'اختبار اتصال TCP' },
  { id: 20, category: 'Network', command: 'Get-NetFirewallRule | Where-Object {$_.Enabled -eq "True"}', description: 'Active firewall rules', descriptionAr: 'قواعد الجدار الناري النشطة' },
  // File System
  { id: 21, category: 'Files', command: 'Get-ChildItem C:\\ -Recurse', description: 'List all files recursively', descriptionAr: 'قائمة الملفات بشكل متكرر' },
  { id: 22, category: 'Files', command: 'Copy-Item "C:\\src" "D:\\dst" -Recurse', description: 'Copy files/folders', descriptionAr: 'نسخ الملفات والمجلدات' },
  { id: 23, category: 'Files', command: 'Remove-Item "C:\\file.txt" -Force', description: 'Delete file forcefully', descriptionAr: 'حذف ملف بالقوة' },
  { id: 24, category: 'Files', command: 'Get-Item "C:\\file.txt" | Select-Object *', description: 'Get file properties', descriptionAr: 'خصائص الملف' },
  { id: 25, category: 'Files', command: 'Rename-Item "old.txt" "new.txt"', description: 'Rename a file', descriptionAr: 'إعادة تسمية ملف' },
  { id: 26, category: 'Files', command: 'New-Item -ItemType Directory -Path "C:\\NewFolder"', description: 'Create new directory', descriptionAr: 'إنشاء مجلد جديد' },
  { id: 27, category: 'Files', command: 'Get-Content "C:\\file.txt"', description: 'Read file content', descriptionAr: 'قراءة محتوى الملف' },
  { id: 28, category: 'Files', command: 'Set-Content "C:\\file.txt" "Hello World"', description: 'Write to file', descriptionAr: 'الكتابة في ملف' },
  { id: 29, category: 'Files', command: 'Compress-Archive -Path "C:\\folder" -DestinationPath "C:\\archive.zip"', description: 'Create ZIP archive', descriptionAr: 'إنشاء ملف ZIP' },
  { id: 30, category: 'Files', command: 'Expand-Archive -Path "C:\\archive.zip" -DestinationPath "C:\\output"', description: 'Extract ZIP archive', descriptionAr: 'استخراج ملف ZIP' },
  // Services
  { id: 31, category: 'Services', command: 'Get-Service', description: 'List all services', descriptionAr: 'قائمة جميع الخدمات' },
  { id: 32, category: 'Services', command: 'Start-Service -Name "wuauserv"', description: 'Start a service', descriptionAr: 'تشغيل خدمة' },
  { id: 33, category: 'Services', command: 'Stop-Service -Name "wuauserv"', description: 'Stop a service', descriptionAr: 'إيقاف خدمة' },
  { id: 34, category: 'Services', command: 'Restart-Service -Name "spooler"', description: 'Restart print spooler', descriptionAr: 'إعادة تشغيل خدمة الطباعة' },
  { id: 35, category: 'Services', command: 'Get-Service | Where-Object {$_.Status -eq "Stopped"}', description: 'List stopped services', descriptionAr: 'الخدمات المتوقفة' },
  // Security
  { id: 36, category: 'Security', command: 'Get-LocalUser', description: 'List local users', descriptionAr: 'قائمة المستخدمين المحليين' },
  { id: 37, category: 'Security', command: 'Get-LocalGroup', description: 'List local groups', descriptionAr: 'قائمة المجموعات المحلية' },
  { id: 38, category: 'Security', command: 'Get-EventLog -LogName Security -Newest 20', description: 'Recent security events', descriptionAr: 'أحداث الأمان الأخيرة' },
  { id: 39, category: 'Security', command: 'Get-MpComputerStatus', description: 'Windows Defender status', descriptionAr: 'حالة Windows Defender' },
  { id: 40, category: 'Security', command: 'Get-NetFirewallProfile', description: 'Firewall profiles', descriptionAr: 'ملفات تعريف الجدار الناري' },
  // Registry
  { id: 41, category: 'Registry', command: 'Get-ItemProperty HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion', description: 'Windows registry info', descriptionAr: 'معلومات سجل ويندوز' },
  { id: 42, category: 'Registry', command: 'Set-ItemProperty -Path "HKCU:\\Software" -Name "Key" -Value "Value"', description: 'Set registry value', descriptionAr: 'تعيين قيمة في السجل' },
  { id: 43, category: 'Registry', command: 'New-Item -Path "HKCU:\\Software\\MyApp"', description: 'Create registry key', descriptionAr: 'إنشاء مفتاح في السجل' },
  // Hardware
  { id: 44, category: 'Hardware', command: 'Get-WmiObject Win32_DiskDrive', description: 'List disk drives', descriptionAr: 'قائمة الأقراص الصلبة' },
  { id: 45, category: 'Hardware', command: 'Get-WmiObject Win32_PhysicalMemory', description: 'RAM details', descriptionAr: 'تفاصيل الذاكرة العشوائية' },
  { id: 46, category: 'Hardware', command: 'Get-WmiObject Win32_VideoController', description: 'GPU information', descriptionAr: 'معلومات بطاقة الرسوميات' },
  { id: 47, category: 'Hardware', command: 'Get-WmiObject Win32_Battery', description: 'Battery status', descriptionAr: 'حالة البطارية' },
  { id: 48, category: 'Hardware', command: 'Get-PSDrive', description: 'List all drives', descriptionAr: 'قائمة جميع الأقراص' },
  // Power
  { id: 49, category: 'Power', command: 'shutdown /s /t 0', description: 'Shutdown immediately', descriptionAr: 'إيقاف التشغيل فوراً' },
  { id: 50, category: 'Power', command: 'shutdown /r /t 0', description: 'Restart immediately', descriptionAr: 'إعادة التشغيل فوراً' },
  { id: 51, category: 'Power', command: 'shutdown /h', description: 'Hibernate', descriptionAr: 'وضع السبات' },
  { id: 52, category: 'Power', command: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0', description: 'Sleep mode', descriptionAr: 'وضع السكون' },
  { id: 53, category: 'Power', command: 'Rundll32.exe user32.dll,LockWorkStation', description: 'Lock workstation', descriptionAr: 'قفل محطة العمل' },
  // Scheduled Tasks
  { id: 54, category: 'Tasks', command: 'Get-ScheduledTask', description: 'List scheduled tasks', descriptionAr: 'قائمة المهام المجدولة' },
  { id: 55, category: 'Tasks', command: 'schtasks /query /fo LIST', description: 'Detailed task list', descriptionAr: 'قائمة المهام التفصيلية' },
  // Updates
  { id: 56, category: 'Updates', command: 'Get-HotFix | Sort-Object InstalledOn -Desc | Select -First 10', description: 'Recent Windows updates', descriptionAr: 'آخر تحديثات ويندوز' },
  { id: 57, category: 'Updates', command: 'wuauclt /detectnow', description: 'Check for updates', descriptionAr: 'البحث عن تحديثات' },
  // Environment
  { id: 58, category: 'Environment', command: 'Get-ChildItem Env:', description: 'List environment variables', descriptionAr: 'متغيرات البيئة' },
  { id: 59, category: 'Environment', command: '$env:PATH', description: 'Show PATH variable', descriptionAr: 'عرض متغير PATH' },
  { id: 60, category: 'Environment', command: '[System.Environment]::GetEnvironmentVariables()', description: 'All environment vars', descriptionAr: 'جميع متغيرات البيئة' },
  // Misc
  { id: 61, category: 'Misc', command: 'Get-Clipboard', description: 'Get clipboard content', descriptionAr: 'محتوى الحافظة' },
  { id: 62, category: 'Misc', command: 'Set-Clipboard "Hello World"', description: 'Set clipboard content', descriptionAr: 'تعيين محتوى الحافظة' },
  { id: 63, category: 'Misc', command: 'Get-Date', description: 'Get current date/time', descriptionAr: 'التاريخ والوقت الحالي' },
  { id: 64, category: 'Misc', command: 'Start-Sleep -Seconds 5', description: 'Sleep for 5 seconds', descriptionAr: 'انتظار 5 ثوانٍ' },
  { id: 65, category: 'Misc', command: 'Write-Host "Hello World" -ForegroundColor Green', description: 'Print colored text', descriptionAr: 'طباعة نص ملون' },
  { id: 66, category: 'Misc', command: 'cls', description: 'Clear screen', descriptionAr: 'مسح الشاشة' },
  { id: 67, category: 'Misc', command: 'Get-History', description: 'Command history', descriptionAr: 'سجل الأوامر' },
  { id: 68, category: 'Misc', command: 'Get-Help Get-Process -Full', description: 'Get full help', descriptionAr: 'المساعدة الكاملة' },
  // Printers
  { id: 69, category: 'Printers', command: 'Get-Printer', description: 'List installed printers', descriptionAr: 'قائمة الطابعات' },
  { id: 70, category: 'Printers', command: 'Get-PrintJob -PrinterName "Microsoft Print to PDF"', description: 'List print jobs', descriptionAr: 'قائمة مهام الطباعة' },
  // Disk
  { id: 71, category: 'Disk', command: 'Get-Volume', description: 'List disk volumes', descriptionAr: 'قائمة أحجام الأقراص' },
  { id: 72, category: 'Disk', command: 'Optimize-Volume -DriveLetter C -Defrag', description: 'Defragment drive C', descriptionAr: 'إلغاء تجزئة القرص C' },
  { id: 73, category: 'Disk', command: 'chkdsk C: /f', description: 'Check disk for errors', descriptionAr: 'فحص القرص للأخطاء' },
  { id: 74, category: 'Disk', command: 'diskpart', description: 'Open disk partition tool', descriptionAr: 'أداة تقسيم الأقراص' },
  // Installed Software
  { id: 75, category: 'Software', command: 'winget list', description: 'List installed apps (winget)', descriptionAr: 'قائمة التطبيقات المثبتة' },
  { id: 76, category: 'Software', command: 'winget install vlc', description: 'Install VLC via winget', descriptionAr: 'تثبيت VLC عبر winget' },
  { id: 77, category: 'Software', command: 'winget upgrade --all', description: 'Update all apps', descriptionAr: 'تحديث جميع التطبيقات' },
  { id: 78, category: 'Software', command: 'Get-Package | Select-Object Name, Version', description: 'List installed packages', descriptionAr: 'قائمة الحزم المثبتة' },
  // Startup
  { id: 79, category: 'Startup', command: 'Get-CimInstance Win32_StartupCommand', description: 'List startup programs', descriptionAr: 'برامج بدء التشغيل' },
  { id: 80, category: 'Startup', command: 'msconfig', description: 'Open System Configuration', descriptionAr: 'فتح إعدادات النظام' },
  // Remote
  { id: 81, category: 'Remote', command: 'Enable-PSRemoting -Force', description: 'Enable PS remoting', descriptionAr: 'تمكين الاتصال عن بعد' },
  { id: 82, category: 'Remote', command: 'Enter-PSSession -ComputerName Server01', description: 'Connect to remote PC', descriptionAr: 'الاتصال بحاسوب عن بعد' },
  // Event Logs
  { id: 83, category: 'Logs', command: 'Get-EventLog -LogName Application -Newest 20', description: 'Recent app events', descriptionAr: 'أحداث التطبيق الأخيرة' },
  { id: 84, category: 'Logs', command: 'Get-EventLog -LogName System -EntryType Error -Newest 10', description: 'Recent system errors', descriptionAr: 'أخطاء النظام الأخيرة' },
  { id: 85, category: 'Logs', command: 'Clear-EventLog -LogName Application', description: 'Clear application log', descriptionAr: 'مسح سجل التطبيق' },
  // Performance
  { id: 86, category: 'Performance', command: 'Get-Counter "\\Processor(_Total)\\% Processor Time"', description: 'Real-time CPU usage', descriptionAr: 'استخدام CPU الفوري' },
  { id: 87, category: 'Performance', command: 'Get-Counter "\\Memory\\Available MBytes"', description: 'Available RAM', descriptionAr: 'الذاكرة المتاحة' },
  { id: 88, category: 'Performance', command: 'Get-Counter "\\PhysicalDisk(_Total)\\Disk Read Bytes/sec"', description: 'Disk read speed', descriptionAr: 'سرعة قراءة القرص' },
  // Users
  { id: 89, category: 'Users', command: 'query user', description: 'Show logged-in users', descriptionAr: 'المستخدمون المسجلون' },
  { id: 90, category: 'Users', command: 'net user', description: 'List all user accounts', descriptionAr: 'قائمة حسابات المستخدمين' },
  { id: 91, category: 'Users', command: 'net user username /active:no', description: 'Disable user account', descriptionAr: 'تعطيل حساب مستخدم' },
  // Certificates
  { id: 92, category: 'Certs', command: 'Get-ChildItem Cert:\\LocalMachine\\My', description: 'List local certificates', descriptionAr: 'قائمة الشهادات المحلية' },
  // DNS
  { id: 93, category: 'DNS', command: 'Resolve-DnsName google.com', description: 'Resolve DNS name', descriptionAr: 'حل اسم DNS' },
  { id: 94, category: 'DNS', command: 'Get-DnsClientCache', description: 'Show DNS cache', descriptionAr: 'عرض ذاكرة DNS' },
  // Misc Advanced
  { id: 95, category: 'Advanced', command: 'sfc /scannow', description: 'System file checker', descriptionAr: 'فحص ملفات النظام' },
  { id: 96, category: 'Advanced', command: 'DISM /Online /Cleanup-Image /RestoreHealth', description: 'Repair Windows image', descriptionAr: 'إصلاح صورة ويندوز' },
  { id: 97, category: 'Advanced', command: 'bcdedit /enum', description: 'Boot configuration', descriptionAr: 'إعدادات الإقلاع' },
  { id: 98, category: 'Advanced', command: 'powercfg /batteryreport', description: 'Battery report', descriptionAr: 'تقرير البطارية' },
  { id: 99, category: 'Advanced', command: 'Get-WinSystemLocale', description: 'System locale', descriptionAr: 'إعدادات اللغة المحلية' },
  { id: 100, category: 'Advanced', command: 'Set-ExecutionPolicy RemoteSigned', description: 'Set execution policy', descriptionAr: 'تعيين سياسة التنفيذ' },
];

const CATEGORIES = ['All', ...Array.from(new Set(PS_COMMANDS.map(c => c.category)))];

export default function PowerShellListScreen() {
  const colors = useColors();
  const { language } = useI18n();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filtered = PS_COMMANDS.filter(cmd => {
    const matchCat = selectedCategory === 'All' || cmd.category === selectedCategory;
    const matchSearch = cmd.command.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase()) ||
      cmd.descriptionAr.includes(search);
    return matchCat && matchSearch;
  });

  const copyCommand = async (cmd: PSCommand) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(cmd.command);
    setCopiedId(cmd.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderItem = ({ item }: { item: PSCommand }) => (
    <View style={[styles.cmdCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <View style={[styles.numBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.numText, { color: colors.primary }]}>{item.id}</Text>
          </View>
          <View style={[styles.catBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.catText, { color: colors.muted }]}>{item.category}</Text>
          </View>
        </View>
        <Text style={[styles.cmdText, { color: '#00D4FF' }]} selectable>{item.command}</Text>
        <Text style={[styles.descText, { color: colors.muted }]}>
          {language === 'ar' ? item.descriptionAr : item.description}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.copyBtn,
          { backgroundColor: copiedId === item.id ? colors.success + '20' : colors.primary + '15' },
          pressed && { opacity: 0.7 }
        ]}
        onPress={() => copyCommand(item)}
      >
        <IconSymbol name={copiedId === item.id ? 'checkmark' : 'doc.on.doc'} size={16} color={copiedId === item.id ? colors.success : colors.primary} />
      </Pressable>
    </View>
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {language === 'ar' ? 'أهم 100 أمر في باور شيل' : 'Top 100 PowerShell Commands'}
        </Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder={language === 'ar' ? 'بحث...' : 'Search commands...'}
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        ListHeaderComponent={
          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.catFilter,
                  { backgroundColor: selectedCategory === item ? colors.primary : colors.surface, borderColor: selectedCategory === item ? colors.primary : colors.border }
                ]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedCategory(item); }}
              >
                <Text style={[styles.catFilterText, { color: selectedCategory === item ? '#fff' : colors.muted }]}>{item}</Text>
              </Pressable>
            )}
            contentContainerStyle={{ gap: 6, paddingBottom: 12 }}
          />
        }
      />
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
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 0.5,
  },
  searchInput: { flex: 1, fontSize: 14 },
  catFilter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  catFilterText: { fontSize: 12, fontWeight: '500' },
  cmdCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  numBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  numText: { fontSize: 10, fontWeight: '700' },
  catBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  catText: { fontSize: 10 },
  cmdText: { fontSize: 12, fontFamily: 'monospace', marginBottom: 4 },
  descText: { fontSize: 12 },
  copyBtn: { padding: 8, borderRadius: 8 },
});
