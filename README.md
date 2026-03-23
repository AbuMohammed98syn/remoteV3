# RemoteCtrl — تطبيق التحكم بسطح المكتب عن بعد

<div align="center">

![RemoteCtrl](./assets/images/icon.png)

**تطبيق موبايل متكامل للتحكم بالحاسوب عن بعد عبر الشبكة المحلية**

[![Build APK](https://github.com/YOUR_USERNAME/remote_desktop_control/actions/workflows/build-apk.yml/badge.svg)](https://github.com/YOUR_USERNAME/remote_desktop_control/actions/workflows/build-apk.yml)

</div>

---

## الميزات

| الميزة | الوصف |
|--------|--------|
| 🖥️ **شاشة عن بعد** | بث مباشر لشاشة الحاسوب مع التحكم باللمس |
| 🖱️ **ماوس** | لوحة تتبع افتراضية بالإيماءات |
| ⌨️ **كيبورد** | لوحة مفاتيح كاملة مع اختصارات |
| 🎨 **رسم** | رسم مباشر على شاشة الحاسوب |
| 📁 **مدير الملفات** | تصفح وإدارة ملفات الحاسوب |
| 📤 **نقل الملفات** | رفع وتنزيل الملفات مع شريط التقدم |
| 📊 **مراقبة النظام** | CPU/RAM/Disk/Network مع رسوم بيانية |
| 💻 **PowerShell** | 20 أمر سريع + قائمة أهم 100 أمر |
| 🖥️ **Terminal CMD** | موجه أوامر تفاعلي مباشر |
| 📋 **مدير المهام** | قائمة العمليات + إنهاؤها |
| 📞 **مكالمات صوتية/مرئية** | اتصال مباشر بين الهاتف والحاسوب |
| ⚡ **التحكم بالطاقة** | إيقاف/إعادة تشغيل/سكون/سبات/قفل |
| 🔒 **PIN Lock** | حماية بكلمة مرور |
| 📋 **مزامنة الحافظة** | مشاركة النص بين الهاتف والحاسوب |
| 🔍 **Network Scanner** | اكتشاف الحاسوب تلقائياً على الشبكة |
| ⚡ **اختصارات مخصصة** | إنشاء أزرار PowerShell مخصصة |

---

## هيكل المشروع

```
remote_desktop_control/
├── app/                    # شاشات التطبيق (Expo Router)
│   ├── (tabs)/             # التبويبات الرئيسية
│   └── screens/            # الشاشات الفرعية
├── components/             # المكونات المشتركة
├── lib/                    # المكتبات (i18n, connection)
├── pc-agent/               # سيرفر الحاسوب (Python)
│   ├── server.py           # السيرفر الرئيسي
│   ├── requirements.txt    # متطلبات Python
│   └── web/                # لوحة الويب للسيرفر
└── .github/workflows/      # GitHub Actions للبناء التلقائي
```

---

## تثبيت وتشغيل التطبيق

### متطلبات التطوير
- Node.js 22+
- pnpm 9+
- Expo CLI

### تشغيل محلي
```bash
# تثبيت الاعتماديات
pnpm install

# تشغيل التطبيق
pnpm dev
```

---

## بناء APK

### الطريقة 1: GitHub Actions (تلقائي) ✅

1. **أنشئ حساب على [expo.dev](https://expo.dev)** واحصل على `EXPO_TOKEN`
2. في GitHub → Settings → Secrets → أضف:
   - `EXPO_TOKEN` = توكن Expo الخاص بك
3. اذهب إلى **Actions** → **Build APK** → **Run workflow**
4. بعد الانتهاء، حمّل APK من **Artifacts**

### الطريقة 2: محلياً
```bash
# تثبيت EAS CLI
npm install -g eas-cli

# تسجيل الدخول
eas login

# بناء APK
eas build --platform android --profile preview
```

---

## تشغيل سيرفر الحاسوب

```bash
cd pc-agent

# تثبيت المتطلبات
pip install -r requirements.txt

# تشغيل السيرفر
python server.py
```

سيظهر عنوان IP الخاص بحاسوبك في النافذة. أدخله في التطبيق مع المنفذ `8765`.

### إضافة كلمة مرور (اختياري)
عدّل ملف `pc-agent/config.json`:
```json
{
  "password": "كلمة_المرور_هنا",
  "ws_port": 8765,
  "web_port": 8766
}
```

### لوحة الويب للسيرفر
افتح المتصفح على: `http://localhost:8766`

---

## التقنيات المستخدمة

| التقنية | الاستخدام |
|---------|-----------|
| React Native + Expo SDK 54 | تطبيق الموبايل |
| NativeWind (Tailwind CSS) | التصميم |
| Expo Router | التنقل |
| WebSocket | الاتصال الفوري |
| Python + websockets | سيرفر الحاسوب |
| psutil | مراقبة النظام |
| pyautogui | التحكم بالماوس/الكيبورد |
| mss + Pillow | التقاط الشاشة |

---

## الدعم والمساهمة

للمساهمة أو الإبلاغ عن مشكلة، افتح Issue على GitHub.

---

<div align="center">
صُنع بـ ❤️ | RemoteCtrl v2.0
</div>
