# Remote Desktop Control - Design Document

## App Overview
A comprehensive mobile remote desktop control app for controlling a PC over local network.
Supports Arabic (RTL) and English (LTR) with a modern, dark-first cybersecurity aesthetic.

## Brand Identity
- **Primary Color**: #00D4FF (Cyan/Electric Blue) — tech, connectivity
- **Accent Color**: #7C3AED (Purple) — premium, power
- **Success**: #10B981 (Green)
- **Warning**: #F59E0B (Amber)
- **Error**: #EF4444 (Red)
- **Background Dark**: #0A0E1A (Deep Navy)
- **Surface Dark**: #111827 (Dark Gray)
- **Background Light**: #F0F4FF (Light Blue-Gray)
- **Surface Light**: #FFFFFF

## Screen List

1. **Splash / Connection Screen** — Enter PC IP address, port, connect
2. **Dashboard (Home)** — Overview of connection status, quick action grid
3. **Remote Screen** — Live screen view with touch-to-click
4. **Mouse & Touchpad** — Virtual trackpad with gestures
5. **Keyboard** — Virtual keyboard with special keys
6. **Drawing Board** — Draw/annotate on PC screen from phone
7. **File Manager** — Browse PC files and folders
8. **File Transfer** — Upload/download files between PC and phone
9. **System Monitor** — CPU, RAM, Disk, Network stats with charts
10. **PowerShell Commands** — 20 quick commands + full list of 100
11. **Terminal (CMD)** — Live command prompt session
12. **Task Manager** — Running processes, kill tasks
13. **Voice/Video Call** — WebRTC-based direct call between phone and PC
14. **Microphone Stream** — Stream phone mic audio to PC
15. **Power Controls** — Shutdown, Restart, Sleep, Lock
16. **Settings** — Language, theme, connection profiles, about

## Primary Content and Functionality

### Connection Screen
- IP address input field
- Port input (default 8765)
- "Connect" button with animation
- Recent connections list
- Connection status indicator

### Dashboard
- Connection status card (green/red)
- PC name, OS, uptime display
- 4x4 quick action grid (icons for all features)
- System stats mini-bar (CPU, RAM)
- Language toggle (AR/EN)

### Remote Screen
- Full-screen WebSocket JPEG stream
- Touch to move mouse
- Tap to click, double-tap to double-click
- Pinch to zoom
- Toolbar: scroll, right-click, keyboard toggle

### Mouse & Touchpad
- Large trackpad area with gesture support
- Left/Right/Middle click buttons
- Scroll wheel simulation
- Sensitivity slider

### Keyboard
- Full QWERTY + Arabic keyboard
- Special keys: Ctrl, Alt, Win, Shift, F1-F12
- Shortcut buttons (Ctrl+C, Ctrl+V, Ctrl+Z, etc.)

### Drawing Board
- Canvas overlay on screen stream
- Pen, eraser, color picker, thickness
- Clear, undo, send drawing to PC

### File Manager
- Tree navigation of PC filesystem
- File icons by type
- Open, copy, move, delete, rename
- Search files

### File Transfer
- Upload from phone to PC
- Download from PC to phone
- Progress bar, speed indicator
- Queue management

### System Monitor
- Real-time CPU usage (line chart)
- RAM usage (donut chart)
- Disk usage per drive
- Network in/out speed
- Top processes list
- Temperature (if available)

### PowerShell Commands
- 20 preset command buttons (one-tap execute)
- Full list of 100 important commands (scrollable)
- Output display panel
- Custom command input

### Terminal (CMD)
- Live interactive terminal session
- Command history
- Copy/paste support
- Auto-scroll

### Task Manager
- Process list with CPU/RAM usage
- Sort by resource usage
- Kill process button
- Search processes

### Voice/Video Call
- WebRTC peer connection
- Camera toggle
- Mic toggle
- Speaker toggle
- Full-screen video

### Power Controls
- Shutdown button (with confirmation)
- Restart button (with confirmation)
- Sleep button
- Lock Screen button
- Schedule shutdown

### Settings
- Language: Arabic / English
- Theme: Dark / Light / Auto
- Connection profiles (save multiple PCs)
- Server port configuration
- About / Help

## Key User Flows

### Connect to PC
1. Open app → Connection Screen
2. Enter IP address (e.g., 192.168.1.100)
3. Tap "Connect" → WebSocket handshake
4. Success → Navigate to Dashboard

### Control Mouse
1. Dashboard → Tap "Mouse" card
2. Drag finger on trackpad → PC cursor moves
3. Tap left button → PC left click
4. Double-tap trackpad → PC double click

### Transfer File
1. Dashboard → Tap "File Transfer"
2. Select "Phone → PC" or "PC → Phone"
3. Pick file → Confirm → Transfer with progress

### Execute PowerShell
1. Dashboard → Tap "PowerShell"
2. Tap preset command OR type custom
3. View output in real-time

### Power Off PC
1. Dashboard → Tap "Power" card
2. Select action (Shutdown/Restart/Sleep/Lock)
3. Confirm dialog → Command sent

## Color Choices
- **Primary**: #00D4FF — Cyan electric blue for tech feel
- **Secondary**: #7C3AED — Purple for premium actions
- **Background**: #0A0E1A dark, #F0F4FF light
- **Cards**: #111827 dark, #FFFFFF light
- **Text**: #E2E8F0 dark, #1E293B light
- **Borders**: #1E3A5F dark, #CBD5E1 light
- **Danger**: #EF4444
- **Success**: #10B981

## Typography
- **Arabic**: Cairo font (Google Fonts)
- **English**: Inter font (Google Fonts)
- **Monospace (Terminal)**: JetBrains Mono

## Layout Principles
- Bottom tab navigation (5 main sections)
- Cards with rounded corners (16px)
- Glassmorphism effects on overlays
- Smooth transitions (300ms)
- RTL support for Arabic
- Haptic feedback on all actions
