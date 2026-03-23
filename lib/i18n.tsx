/**
 * RemoteCtrl – i18n Context (Arabic / English)
 */
import React, {
  createContext, useContext, useState, useCallback,
  useEffect, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Lang = 'ar' | 'en';

const LANG_KEY = 'rc_language';

// ─── Translations ─────────────────────────────────────────────────────────────

const translations = {
  en: {
    appName: 'RemoteCtrl',
    connect: 'Connect',
    disconnect: 'Disconnect',
    connected: 'Connected',
    connecting: 'Connecting…',
    disconnected: 'Disconnected',
    connectionTitle: 'Connect to PC',
    ipAddress: 'IP Address',
    ipPlaceholder: 'Enter PC IP address',
    port: 'Port',
    portPlaceholder: '8765',
    profileName: 'Profile Name',
    recentConnections: 'Recent Connections',
    quickActions: 'Quick Actions',
    error: 'Error',
    enterIp: 'Please enter an IP address',
    cancel: 'Cancel',
    confirm: 'Confirm',
    cpu: 'CPU',
    ram: 'RAM',
    disk: 'Disk',
    network: 'Network',
    uptime: 'Uptime',
    settingsTitle: 'Settings',
    language: 'Language',
    appearance: 'Appearance',
    dark: 'Dark',
    light: 'Light',
    connection: 'Connection',
    keepScreenOn: 'Keep Screen On',
    hapticFeedback: 'Haptic Feedback',
    about: 'About',
    version: 'Version',
    savedProfiles: 'Saved Profiles',
    deleteProfile: 'Delete Profile',
    noProfiles: 'No saved connections',
    send: 'Send',
    clear: 'Clear',
    copy: 'Copy',
    paste: 'Paste',
    save: 'Save',
    delete: 'Delete',
    rename: 'Rename',
    newFolder: 'New Folder',
    upload: 'Upload',
    download: 'Download',
    search: 'Search',
    back: 'Back',
    close: 'Close',
    ok: 'OK',
    yes: 'Yes',
    no: 'No',
    loading: 'Loading…',
    noData: 'No data',
    processes: 'Processes',
    killProcess: 'Kill Process',
    killConfirm: 'Are you sure you want to kill this process?',
    shutdown: 'Shutdown',
    restart: 'Restart',
    sleep: 'Sleep',
    lock: 'Lock',
    logoff: 'Log Off',
    cancel2: 'Cancel Shutdown',
    screenStream: 'Screen Stream',
    startStream: 'Start Stream',
    stopStream: 'Stop Stream',
    mouseControl: 'Mouse Control',
    leftClick: 'Left Click',
    rightClick: 'Right Click',
    doubleClick: 'Double Click',
    scroll: 'Scroll',
    sensitivity: 'Sensitivity',
    keyboardControl: 'Keyboard',
    typeText: 'Type text…',
    specialKeys: 'Special Keys',
    clipboard: 'Clipboard',
    terminal: 'Terminal',
    powershell: 'PowerShell',
    runCommand: 'Run Command',
    fileManager: 'File Manager',
    fileTransfer: 'File Transfer',
    systemMonitor: 'System Monitor',
    taskManager: 'Task Manager',
    voiceCall: 'Voice Call',
    videoCall: 'Video Call',
    startCall: 'Start Call',
    endCall: 'End Call',
    mute: 'Mute',
    unmute: 'Unmute',
    camera: 'Camera',
    drawing: 'Drawing Board',
    clearCanvas: 'Clear Canvas',
    undo: 'Undo',
    color: 'Color',
    thickness: 'Thickness',
    networkScanner: 'Network Scanner',
    scanning: 'Scanning…',
    devicesFound: 'Devices Found',
    scanNetwork: 'Scan Network',
    shortcuts: 'Shortcuts',
    addShortcut: 'Add Shortcut',
    pinLock: 'PIN Lock',
    enterPin: 'Enter PIN',
    confirmPin: 'Confirm PIN',
    wrongPin: 'Wrong PIN',
    setPinTitle: 'Set PIN',
    clipboardSync: 'Clipboard Sync',
    syncToPhone: 'Sync to Phone',
    syncToPc: 'Sync to PC',
  },
  ar: {
    appName: 'ريموت كترل',
    connect: 'اتصال',
    disconnect: 'قطع الاتصال',
    connected: 'متصل',
    connecting: 'جارٍ الاتصال…',
    disconnected: 'غير متصل',
    connectionTitle: 'الاتصال بالحاسوب',
    ipAddress: 'عنوان IP',
    ipPlaceholder: 'أدخل عنوان IP للحاسوب',
    port: 'المنفذ',
    portPlaceholder: '8765',
    profileName: 'اسم الاتصال',
    recentConnections: 'الاتصالات الأخيرة',
    quickActions: 'الإجراءات السريعة',
    error: 'خطأ',
    enterIp: 'الرجاء إدخال عنوان IP',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    cpu: 'المعالج',
    ram: 'الذاكرة',
    disk: 'القرص',
    network: 'الشبكة',
    uptime: 'وقت التشغيل',
    settingsTitle: 'الإعدادات',
    language: 'اللغة',
    appearance: 'المظهر',
    dark: 'داكن',
    light: 'فاتح',
    connection: 'الاتصال',
    keepScreenOn: 'إبقاء الشاشة مضاءة',
    hapticFeedback: 'الاهتزاز',
    about: 'حول',
    version: 'الإصدار',
    savedProfiles: 'الاتصالات المحفوظة',
    deleteProfile: 'حذف الاتصال',
    noProfiles: 'لا توجد اتصالات محفوظة',
    send: 'إرسال',
    clear: 'مسح',
    copy: 'نسخ',
    paste: 'لصق',
    save: 'حفظ',
    delete: 'حذف',
    rename: 'إعادة تسمية',
    newFolder: 'مجلد جديد',
    upload: 'رفع',
    download: 'تنزيل',
    search: 'بحث',
    back: 'رجوع',
    close: 'إغلاق',
    ok: 'موافق',
    yes: 'نعم',
    no: 'لا',
    loading: 'جارٍ التحميل…',
    noData: 'لا توجد بيانات',
    processes: 'العمليات',
    killProcess: 'إنهاء العملية',
    killConfirm: 'هل تريد إنهاء هذه العملية؟',
    shutdown: 'إيقاف التشغيل',
    restart: 'إعادة التشغيل',
    sleep: 'وضع السكون',
    lock: 'قفل الشاشة',
    logoff: 'تسجيل الخروج',
    cancel2: 'إلغاء الإيقاف',
    screenStream: 'بث الشاشة',
    startStream: 'بدء البث',
    stopStream: 'إيقاف البث',
    mouseControl: 'التحكم بالماوس',
    leftClick: 'نقر يسار',
    rightClick: 'نقر يمين',
    doubleClick: 'نقر مزدوج',
    scroll: 'تمرير',
    sensitivity: 'الحساسية',
    keyboardControl: 'لوحة المفاتيح',
    typeText: 'اكتب النص…',
    specialKeys: 'مفاتيح خاصة',
    clipboard: 'الحافظة',
    terminal: 'الطرفية',
    powershell: 'باور شيل',
    runCommand: 'تشغيل الأمر',
    fileManager: 'مدير الملفات',
    fileTransfer: 'نقل الملفات',
    systemMonitor: 'مراقبة النظام',
    taskManager: 'مدير المهام',
    voiceCall: 'مكالمة صوتية',
    videoCall: 'مكالمة مرئية',
    startCall: 'بدء المكالمة',
    endCall: 'إنهاء المكالمة',
    mute: 'كتم',
    unmute: 'إلغاء الكتم',
    camera: 'الكاميرا',
    drawing: 'لوحة الرسم',
    clearCanvas: 'مسح اللوحة',
    undo: 'تراجع',
    color: 'اللون',
    thickness: 'السماكة',
    networkScanner: 'فحص الشبكة',
    scanning: 'جارٍ الفحص…',
    devicesFound: 'أجهزة موجودة',
    scanNetwork: 'فحص الشبكة',
    shortcuts: 'الاختصارات',
    addShortcut: 'إضافة اختصار',
    pinLock: 'قفل PIN',
    enterPin: 'أدخل PIN',
    confirmPin: 'تأكيد PIN',
    wrongPin: 'PIN خاطئ',
    setPinTitle: 'تعيين PIN',
    clipboardSync: 'مزامنة الحافظة',
    syncToPhone: 'مزامنة للهاتف',
    syncToPc: 'مزامنة للحاسوب',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

// ─── Context ──────────────────────────────────────────────────────────────────

interface I18nContextValue {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Lang>('ar');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved === 'en' || saved === 'ar') setLang(saved);
    });
  }, []);

  const setLanguage = useCallback((lang: Lang) => {
    setLang(lang);
    AsyncStorage.setItem(LANG_KEY, lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => translations[language][key] ?? translations.en[key] ?? key,
    [language],
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, isRTL: language === 'ar' }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be inside <I18nProvider>');
  return ctx;
}
