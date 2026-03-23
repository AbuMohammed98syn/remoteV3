# RemoteCtrl v3.0 - Complete Setup Guide

## 🎯 What's Included

✅ **Mobile App** - React Native with Expo (18 screens, 5 tabs)
✅ **PC Server** - Python WebSocket server with all features
✅ **Web Dashboard** - Real-time status monitoring
✅ **Complete Features** - All 15+ features fully implemented

---

## 📱 Mobile App Setup

### Prerequisites
- Node.js 18+
- npm or pnpm
- Expo Go app on your phone

### Installation

```bash
cd remote_desktop_control
npm install --legacy-peer-deps
```

### Running on Phone

**Option 1: Expo Go (Fastest)**
```bash
npm run android
# or
npm run ios
```
Then scan the QR code with Expo Go app.

**Option 2: Build APK**
```bash
npx eas build -p android --profile preview
```

---

## 🖥️ PC Server Setup

### Prerequisites
- Python 3.8+
- pip

### Installation

```bash
cd pc-agent
pip install -r requirements.txt
```

### Running Server

```bash
python server.py
```

You'll see:
```
============================================================
  🖥️  RemoteCtrl PC Agent v3.0 - COMPLETE
============================================================
  📡 WebSocket:    ws://192.168.1.X:8765
  🌐 Web Dashboard: http://192.168.1.X:8766
  🔒 Password:     ❌ None (open)
  🖥️  Screen:       ✅ Available
  🖱️  Mouse/KB:     ✅ Available
  📋 Clipboard:    ✅ Available
  🖨️  Printing:     ✅ Available
============================================================
```

---

## 🔌 Connecting App to PC

1. **Open RemoteCtrl app on phone**
2. **Tap "Connect"**
3. **Enter PC IP:** `192.168.1.X` (from server output)
4. **Enter Port:** `8765`
5. **Tap "Connect"**

---

## ✅ Features Checklist

### Screen & Control
- ✅ Live screen capture & streaming
- ✅ Mouse control (move, click, scroll, drag)
- ✅ Keyboard control (type, hotkeys)
- ✅ Drawing on screen
- ✅ Multi-touch support

### File Management
- ✅ Browse PC files
- ✅ Upload files from phone
- ✅ Download files to phone
- ✅ Delete files
- ✅ Create folders

### Printing
- ✅ Detect connected printers
- ✅ Show printer status
- ✅ Upload file from phone
- ✅ Print to selected printer
- ✅ Print status feedback

### System Control
- ✅ PowerShell commands (20 quick + 100 list)
- ✅ Terminal/CMD execution
- ✅ Task Manager (list & kill processes)
- ✅ System monitoring (CPU/RAM/Disk/Network)
- ✅ Shutdown/Restart/Sleep/Lock

### Communication
- ✅ Voice calls (phone ↔ PC)
- ✅ Video calls (phone ↔ PC)
- ✅ Microphone streaming
- ✅ Clipboard sync

### Additional
- ✅ Network scanner (auto-discover PCs)
- ✅ PIN/password protection
- ✅ Custom shortcuts
- ✅ Connection profiles
- ✅ Arabic/English support

---

## 🔧 Troubleshooting

### Connection Failed
1. Check Windows Firewall - allow ports 8765 & 8766
2. Ensure phone & PC on same WiFi
3. Verify IP address is correct
4. Check server is running: `python server.py`

### Screen Not Showing
- Ensure `mss` and `Pillow` are installed
- Run: `pip install mss Pillow`

### Mouse/Keyboard Not Working
- Ensure `pyautogui` is installed
- Run: `pip install pyautogui`

### Printing Not Working
- Windows only: Install `pywin32`
- Run: `pip install pywin32`
- Restart server

---

## 🚀 Performance Tips

1. **Reduce screen quality** - Set to 40-50 for faster streaming
2. **Reduce screen scale** - Set to 0.4-0.5 for faster transfer
3. **Reduce FPS** - Set to 10-15 for lower bandwidth
4. **Close background apps** - Free up CPU/RAM

Edit `pc-agent/config.json`:
```json
{
  "screen_quality": 50,
  "screen_fps": 10,
  "screen_scale": 0.5
}
```

---

## 📝 Configuration

Create `pc-agent/config.json`:
```json
{
  "ws_port": 8765,
  "web_port": 8766,
  "password": "your_password_here",
  "screen_quality": 60,
  "screen_fps": 15,
  "screen_scale": 0.6
}
```

---

## 🐛 Debug Mode

Run server with debug logging:
```bash
python server.py
```

Check logs for errors - all messages are logged with timestamps.

---

## 📞 Support

For issues:
1. Check server console for error messages
2. Check phone app logs (Expo Go)
3. Verify firewall settings
4. Ensure all dependencies installed

---

**RemoteCtrl v3.0 - Complete Remote Desktop Control** ✨
