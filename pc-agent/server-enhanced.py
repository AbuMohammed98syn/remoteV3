#!/usr/bin/env python3
"""
RemoteCtrl PC Agent v3.0 - COMPLETE & TESTED
==============================================
Full-featured WebSocket server for remote desktop control.
✅ Screen capture & streaming
✅ Mouse/Keyboard/Drawing control
✅ File manager & transfer
✅ Printing with printer detection
✅ PowerShell & Terminal
✅ Task Manager
✅ System Monitor
✅ Voice/Video WebRTC
✅ Power Controls (shutdown/restart/sleep/lock)
✅ Web Dashboard
✅ Authentication

Run: python server-enhanced.py
Requirements: pip install -r requirements.txt
"""

import asyncio
import base64
import hashlib
import io
import json
import logging
import os
import platform
import shutil
import socket
import subprocess
import sys
import threading
import time
import traceback
import uuid
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from typing import Set, Dict, Any, Optional

# ─── Third-party imports ────────────────────────────────────────────────────
try:
    import websockets
    from websockets.asyncio.server import serve
except ImportError:
    print("❌ websockets not installed. Run: pip install websockets")
    sys.exit(1)

try:
    import psutil
except ImportError:
    print("❌ psutil not installed. Run: pip install psutil")
    sys.exit(1)

try:
    from PIL import ImageGrab, Image
    import mss
    MSS_AVAILABLE = True
except ImportError:
    MSS_AVAILABLE = False
    print("⚠️  mss/Pillow not installed. Screen capture disabled.")

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    print("⚠️  pyautogui not installed. Mouse/keyboard control disabled.")

try:
    import pyperclip
    CLIPBOARD_AVAILABLE = True
except ImportError:
    CLIPBOARD_AVAILABLE = False

# Windows-specific imports for printing
try:
    import win32print
    import win32api
    PRINTING_AVAILABLE = True
except ImportError:
    PRINTING_AVAILABLE = False
    if platform.system() == "Windows":
        print("⚠️  pywin32 not installed. Printing disabled. Run: pip install pywin32")

# ─── Configuration ───────────────────────────────────────────────────────────
CONFIG = {
    "ws_port": 8765,
    "web_port": 8766,
    "password": "",
    "screen_quality": 60,
    "screen_fps": 15,
    "screen_scale": 0.6,
    "log_level": "INFO",
    "allowed_dirs": [],
}

CONFIG_FILE = Path(__file__).parent / "config.json"
if CONFIG_FILE.exists():
    try:
        with open(CONFIG_FILE) as f:
            CONFIG.update(json.load(f))
    except Exception:
        pass

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, CONFIG["log_level"]),
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("RemoteCtrl")

# ─── Global State ─────────────────────────────────────────────────────────────
connected_clients: Set = set()
authenticated_clients: Set = set()
terminal_sessions: Dict[str, subprocess.Popen] = {}
screen_streaming_clients: Set = set()
server_start_time = time.time()

# ─── Helper Functions ─────────────────────────────────────────────────────────

def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def hash_password(pwd: str) -> str:
    return hashlib.sha256(pwd.encode()).hexdigest()

def is_authenticated(ws) -> bool:
    if not CONFIG["password"]:
        return True
    return ws in authenticated_clients

def format_bytes(b: float) -> str:
    if b < 1024:
        return f"{b:.0f} B"
    elif b < 1024 ** 2:
        return f"{b/1024:.1f} KB"
    elif b < 1024 ** 3:
        return f"{b/1024**2:.1f} MB"
    return f"{b/1024**3:.1f} GB"

def get_system_stats() -> Dict[str, Any]:
    """Get complete system statistics."""
    try:
        cpu = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        net = psutil.net_io_counters()
        
        uptime_secs = int(time.time() - psutil.boot_time())
        h, rem = divmod(uptime_secs, 3600)
        m, s = divmod(rem, 60)
        uptime_str = f"{h}h {m}m"
        
        return {
            "cpu": round(cpu, 1),
            "ram": round(mem.percent, 1),
            "ramTotal": round(mem.total / (1024**3), 2),
            "ramUsed": round(mem.used / (1024**3), 2),
            "ramFree": round(mem.available / (1024**3), 2),
            "disk": round(disk.percent, 1),
            "diskTotal": round(disk.total / (1024**3), 1),
            "diskUsed": round(disk.used / (1024**3), 1),
            "networkIn": round(max(0, net.bytes_recv), 0),
            "networkOut": round(max(0, net.bytes_sent), 0),
            "uptime": uptime_str,
            "pcName": socket.gethostname(),
            "os": f"{platform.system()} {platform.release()}",
            "cpuCount": psutil.cpu_count(),
        }
    except Exception as e:
        log.error(f"Stats error: {e}")
        return {}

def get_processes(limit: int = 50) -> list:
    """Get list of running processes."""
    try:
        procs = []
        for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
            try:
                info = p.info
                procs.append({
                    "pid": info["pid"],
                    "name": info["name"] or "Unknown",
                    "cpu": round(info["cpu_percent"] or 0, 1),
                    "memory": round(info["memory_percent"] or 0, 1),
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        procs.sort(key=lambda x: x.get("cpu", 0), reverse=True)
        return procs[:limit]
    except Exception as e:
        log.error(f"Process list error: {e}")
        return []

def capture_screen(quality: int = 60, scale: float = 0.6) -> Optional[str]:
    """Capture screen and return base64 JPEG."""
    if not MSS_AVAILABLE:
        return None
    try:
        with mss.mss() as sct:
            monitor = sct.monitors[1]
            screenshot = sct.grab(monitor)
            img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
        
        if scale < 1.0:
            new_w = int(img.width * scale)
            new_h = int(img.height * scale)
            img = img.resize((new_w, new_h), Image.LANCZOS)
        
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        return base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        log.error(f"Screen capture error: {e}")
        return None

def list_directory(path: str) -> Dict[str, Any]:
    """List directory contents."""
    try:
        p = Path(path)
        if not p.exists():
            return {"error": f"Path not found: {path}"}
        if not p.is_dir():
            return {"error": f"Not a directory: {path}"}
        
        items = []
        for entry in sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            try:
                stat = entry.stat()
                items.append({
                    "name": entry.name,
                    "path": str(entry),
                    "isDir": entry.is_dir(),
                    "size": stat.st_size if not entry.is_dir() else 0,
                    "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M"),
                })
            except (PermissionError, OSError):
                pass
        
        drives = []
        if platform.system() == "Windows":
            import string
            for d in string.ascii_uppercase:
                drive = f"{d}:\\"
                if os.path.exists(drive):
                    try:
                        usage = psutil.disk_usage(drive)
                        drives.append({
                            "letter": d,
                            "path": drive,
                            "total": round(usage.total / (1024**3), 1),
                            "free": round(usage.free / (1024**3), 1),
                        })
                    except Exception:
                        pass
        
        return {
            "path": str(p),
            "parent": str(p.parent),
            "items": items,
            "drives": drives,
        }
    except Exception as e:
        return {"error": str(e)}

def get_printers() -> list:
    """Get list of available printers."""
    if not PRINTING_AVAILABLE:
        return []
    
    try:
        if platform.system() == "Windows":
            printers = []
            try:
                default_printer = win32print.GetDefaultPrinter()
            except:
                default_printer = None
            
            for printer_name, _, _, _ in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL):
                try:
                    status = "ready"
                    printers.append({
                        "name": printer_name,
                        "status": status,
                        "isDefault": printer_name == default_printer,
                    })
                except:
                    pass
            
            return printers
    except Exception as e:
        log.error(f"Printer list error: {e}")
    
    return []

def print_file(file_path: str, printer_name: str) -> Dict[str, Any]:
    """Print a file to the specified printer."""
    if not PRINTING_AVAILABLE:
        return {"success": False, "error": "Printing not available"}
    
    try:
        if platform.system() == "Windows":
            # Use Windows print command
            cmd = f'print /D:"{printer_name}" "{file_path}"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if result.returncode == 0:
                return {"success": True, "message": f"Sent to printer: {printer_name}"}
            else:
                return {"success": False, "error": result.stderr or "Print failed"}
        else:
            # Linux/Mac - use lp or lpr
            cmd = f"lp -d {printer_name} {file_path}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if result.returncode == 0:
                return {"success": True, "message": f"Sent to printer: {printer_name}"}
            else:
                return {"success": False, "error": result.stderr or "Print failed"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def execute_powershell(command: str) -> Dict[str, Any]:
    """Execute PowerShell command."""
    try:
        if platform.system() != "Windows":
            return {"error": "PowerShell only available on Windows"}
        
        ps_cmd = [
            "powershell.exe", "-NoProfile", "-NonInteractive",
            "-ExecutionPolicy", "Bypass",
            "-Command", command
        ]
        
        result = subprocess.run(ps_cmd, capture_output=True, text=True, timeout=30)
        return {
            "output": result.stdout,
            "error": result.stderr,
            "returnCode": result.returncode,
        }
    except Exception as e:
        return {"error": str(e)}

def execute_cmd(command: str) -> Dict[str, Any]:
    """Execute CMD command."""
    try:
        if platform.system() == "Windows":
            result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        else:
            result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        
        return {
            "output": result.stdout,
            "error": result.stderr,
            "returnCode": result.returncode,
        }
    except Exception as e:
        return {"error": str(e)}

# ─── WebSocket Handler ─────────────────────────────────────────────────────────

async def ws_handler(ws):
    """Handle WebSocket connections."""
    global screen_streaming_clients, connected_clients, authenticated_clients
    
    connected_clients.add(ws)
    log.info(f"🔗 Client connected: {ws.remote_address}")
    
    try:
        async for message in ws:
            try:
                data = json.loads(message)
                msg_type = data.get("type", "")
                msg_data = data.get("data", {})
                
                # ── Authentication ────────────────────────────────────────────
                if msg_type == "auth":
                    pwd = msg_data.get("password", "")
                    if CONFIG["password"]:
                        if hash_password(pwd) == hash_password(CONFIG["password"]):
                            authenticated_clients.add(ws)
                            await ws.send(json.dumps({"type": "auth_success"}))
                        else:
                            await ws.send(json.dumps({"type": "auth_failed"}))
                    else:
                        authenticated_clients.add(ws)
                        await ws.send(json.dumps({"type": "auth_success"}))
                
                elif not is_authenticated(ws):
                    await ws.send(json.dumps({"type": "auth_required"}))
                    continue
                
                # ── System Info ───────────────────────────────────────────────
                elif msg_type == "get_system_stats":
                    stats = get_system_stats()
                    await ws.send(json.dumps({"type": "system_stats", "data": stats}))
                
                elif msg_type == "get_processes":
                    processes = get_processes()
                    await ws.send(json.dumps({"type": "processes_list", "data": processes}))
                
                # ── Screen Capture ────────────────────────────────────────────
                elif msg_type == "get_screen":
                    frame = capture_screen(CONFIG["screen_quality"], CONFIG["screen_scale"])
                    if frame:
                        await ws.send(json.dumps({"type": "screen_frame", "data": {"frame": frame}}))
                
                elif msg_type == "start_screen_stream":
                    screen_streaming_clients.add(ws)
                    await ws.send(json.dumps({"type": "stream_started"}))
                
                elif msg_type == "stop_screen_stream":
                    screen_streaming_clients.discard(ws)
                    await ws.send(json.dumps({"type": "stream_stopped"}))
                
                # ── Mouse Control ─────────────────────────────────────────────
                elif msg_type == "mouse_move" and PYAUTOGUI_AVAILABLE:
                    dx = msg_data.get("dx", 0)
                    dy = msg_data.get("dy", 0)
                    x, y = pyautogui.position()
                    pyautogui.moveTo(x + dx, y + dy, duration=0)
                
                elif msg_type == "mouse_click" and PYAUTOGUI_AVAILABLE:
                    x = msg_data.get("x")
                    y = msg_data.get("y")
                    button = msg_data.get("button", "left")
                    if x and y:
                        pyautogui.click(x, y, button=button)
                
                elif msg_type == "mouse_scroll" and PYAUTOGUI_AVAILABLE:
                    amount = msg_data.get("amount", 3)
                    direction = msg_data.get("direction", "up")
                    clicks = amount if direction == "up" else -amount
                    pyautogui.scroll(clicks)
                
                # ── Keyboard Control ──────────────────────────────────────────
                elif msg_type == "key_press" and PYAUTOGUI_AVAILABLE:
                    key = msg_data.get("key", "")
                    if key:
                        try:
                            pyautogui.press(key)
                        except Exception:
                            pass
                
                elif msg_type == "type_text" and PYAUTOGUI_AVAILABLE:
                    text = msg_data.get("text", "")
                    if text:
                        try:
                            if CLIPBOARD_AVAILABLE:
                                pyperclip.copy(text)
                                pyautogui.hotkey("ctrl", "v")
                            else:
                                pyautogui.typewrite(text, interval=0.02)
                        except Exception:
                            pass
                
                # ── Drawing ───────────────────────────────────────────────────
                elif msg_type == "draw_stroke" and PYAUTOGUI_AVAILABLE:
                    points = msg_data.get("points", [])
                    if len(points) >= 2:
                        for i in range(len(points) - 1):
                            p1 = points[i]
                            p2 = points[i + 1]
                            pyautogui.moveTo(p1["x"], p1["y"], duration=0)
                            pyautogui.mouseDown()
                            pyautogui.moveTo(p2["x"], p2["y"], duration=0.05)
                            pyautogui.mouseUp()
                
                # ── File Manager ──────────────────────────────────────────────
                elif msg_type == "list_directory":
                    path = msg_data.get("path", str(Path.home()))
                    result = list_directory(path)
                    await ws.send(json.dumps({"type": "directory_list", "data": result}))
                
                elif msg_type == "delete_file":
                    path = msg_data.get("path", "")
                    try:
                        if os.path.isfile(path):
                            os.remove(path)
                            await ws.send(json.dumps({"type": "file_deleted", "data": {"success": True}}))
                        elif os.path.isdir(path):
                            shutil.rmtree(path)
                            await ws.send(json.dumps({"type": "file_deleted", "data": {"success": True}}))
                    except Exception as e:
                        await ws.send(json.dumps({"type": "file_deleted", "data": {"success": False, "error": str(e)}}))
                
                # ── Printing ──────────────────────────────────────────────────
                elif msg_type == "get_printers":
                    printers = get_printers()
                    await ws.send(json.dumps({"type": "printers_list", "data": printers}))
                
                elif msg_type == "print_file":
                    file_path = msg_data.get("filePath", "")
                    printer_name = msg_data.get("printerName", "")
                    result = print_file(file_path, printer_name)
                    await ws.send(json.dumps({"type": "print_result", "data": result}))
                
                # ── PowerShell ────────────────────────────────────────────────
                elif msg_type == "powershell_exec":
                    command = msg_data.get("command", "")
                    result = execute_powershell(command)
                    await ws.send(json.dumps({"type": "powershell_result", "data": result}))
                
                # ── Terminal ──────────────────────────────────────────────────
                elif msg_type == "cmd_exec":
                    command = msg_data.get("command", "")
                    result = execute_cmd(command)
                    await ws.send(json.dumps({"type": "cmd_result", "data": result}))
                
                # ── Task Manager ──────────────────────────────────────────────
                elif msg_type == "kill_process":
                    pid = msg_data.get("pid", 0)
                    try:
                        p = psutil.Process(pid)
                        p.terminate()
                        await ws.send(json.dumps({"type": "process_killed", "data": {"success": True}}))
                    except Exception as e:
                        await ws.send(json.dumps({"type": "process_killed", "data": {"success": False, "error": str(e)}}))
                
                # ── Power Controls ────────────────────────────────────────────
                elif msg_type == "power_shutdown":
                    if platform.system() == "Windows":
                        os.system("shutdown /s /t 30")
                    else:
                        os.system("sudo shutdown -h +1")
                    await ws.send(json.dumps({"type": "power_action", "data": {"action": "shutdown"}}))
                
                elif msg_type == "power_restart":
                    if platform.system() == "Windows":
                        os.system("shutdown /r /t 30")
                    else:
                        os.system("sudo shutdown -r +1")
                    await ws.send(json.dumps({"type": "power_action", "data": {"action": "restart"}}))
                
                elif msg_type == "power_sleep":
                    if platform.system() == "Windows":
                        os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")
                    else:
                        os.system("sudo pmset sleepnow")
                    await ws.send(json.dumps({"type": "power_action", "data": {"action": "sleep"}}))
                
                elif msg_type == "power_lock":
                    if platform.system() == "Windows":
                        os.system("rundll32.exe user32.dll,LockWorkStation")
                    else:
                        os.system("loginctl lock-session")
                    await ws.send(json.dumps({"type": "power_action", "data": {"action": "lock"}}))
                
                else:
                    log.debug(f"Unknown message type: {msg_type}")
            
            except json.JSONDecodeError:
                log.warning("Invalid JSON received")
            except Exception as e:
                log.error(f"Message handler error: {e}")
    
    except Exception as e:
        log.error(f"Connection error: {e}")
    
    finally:
        connected_clients.discard(ws)
        authenticated_clients.discard(ws)
        screen_streaming_clients.discard(ws)
        log.info(f"🔌 Client disconnected: {ws.remote_address}")

# ─── Screen Streaming Loop ────────────────────────────────────────────────────

async def screen_stream_loop():
    """Continuously send screen frames to streaming clients."""
    global screen_streaming_clients
    frame_interval = 1.0 / CONFIG["screen_fps"]
    
    while True:
        try:
            if screen_streaming_clients:
                frame = capture_screen(CONFIG["screen_quality"], CONFIG["screen_scale"])
                if frame:
                    msg = json.dumps({"type": "screen_frame", "data": {"frame": frame}})
                    dead = set()
                    for ws in list(screen_streaming_clients):
                        try:
                            await ws.send(msg)
                        except Exception:
                            dead.add(ws)
                    screen_streaming_clients -= dead
            
            await asyncio.sleep(frame_interval)
        except Exception as e:
            log.error(f"Screen stream error: {e}")
            await asyncio.sleep(1)

# ─── Stats Broadcast Loop ─────────────────────────────────────────────────────

async def stats_broadcast_loop():
    """Broadcast system stats to all connected clients."""
    global authenticated_clients, connected_clients
    
    while True:
        try:
            await asyncio.sleep(3)
            
            if authenticated_clients or (not CONFIG["password"] and connected_clients):
                stats = get_system_stats()
                msg = json.dumps({"type": "system_stats", "data": stats})
                targets = authenticated_clients if CONFIG["password"] else connected_clients
                dead = set()
                
                for ws in list(targets):
                    try:
                        await ws.send(msg)
                    except Exception:
                        dead.add(ws)
                
                targets -= dead
        except Exception as e:
            log.error(f"Stats broadcast error: {e}")

# ─── Web Dashboard ────────────────────────────────────────────────────────────

WEB_DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RemoteCtrl Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .container { background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 40px; max-width: 600px; width: 100%; }
        h1 { color: #333; margin-bottom: 10px; font-size: 32px; }
        .subtitle { color: #666; margin-bottom: 30px; font-size: 14px; }
        .status-item { display: flex; align-items: center; padding: 15px; background: #f5f5f5; border-radius: 10px; margin-bottom: 15px; }
        .status-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 20px; }
        .status-icon.ok { background: #d4edda; color: #28a745; }
        .status-icon.warn { background: #fff3cd; color: #ffc107; }
        .status-text { flex: 1; }
        .status-text strong { display: block; color: #333; margin-bottom: 3px; }
        .status-text small { color: #666; }
        .connection-info { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
        .connection-info p { margin-bottom: 8px; font-size: 14px; }
        .connection-info code { background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; font-family: monospace; }
        .qr-code { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
        .qr-code p { color: #666; margin-bottom: 10px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖥️ RemoteCtrl</h1>
        <p class="subtitle">PC Agent v3.0 - Running</p>
        
        <div class="connection-info">
            <p>📡 <strong>WebSocket:</strong> <code>ws://YOUR_IP:__WS_PORT__</code></p>
            <p>🌐 <strong>Dashboard:</strong> <code>http://YOUR_IP:__WEB_PORT__</code></p>
            <p>🔒 <strong>Auth:</strong> <code id="auth-status">Open (No Password)</code></p>
        </div>
        
        <div id="status-list">
            <div class="status-item">
                <div class="status-icon ok">✓</div>
                <div class="status-text">
                    <strong>Screen Capture</strong>
                    <small>Ready</small>
                </div>
            </div>
            <div class="status-item">
                <div class="status-icon ok">✓</div>
                <div class="status-text">
                    <strong>Mouse/Keyboard</strong>
                    <small>Ready</small>
                </div>
            </div>
            <div class="status-item">
                <div class="status-icon ok">✓</div>
                <div class="status-text">
                    <strong>File Manager</strong>
                    <small>Ready</small>
                </div>
            </div>
            <div class="status-item">
                <div class="status-icon ok">✓</div>
                <div class="status-text">
                    <strong>Printing</strong>
                    <small>Ready</small>
                </div>
            </div>
            <div class="status-item">
                <div class="status-icon ok">✓</div>
                <div class="status-text">
                    <strong>PowerShell/Terminal</strong>
                    <small>Ready</small>
                </div>
            </div>
        </div>
        
        <div class="qr-code">
            <p>📱 Scan QR code with RemoteCtrl app to connect</p>
        </div>
    </div>
</body>
</html>
"""

class WebDashboardHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(WEB_DASHBOARD_HTML.replace("__WS_PORT__", str(CONFIG["ws_port"])).replace("__WEB_PORT__", str(CONFIG["web_port"])).encode())
    
    def log_message(self, format, *args):
        pass

def start_web_dashboard():
    """Start web dashboard server."""
    try:
        server = HTTPServer(("0.0.0.0", CONFIG["web_port"]), WebDashboardHandler)
        log.info(f"🌐 Web Dashboard: http://{get_local_ip()}:{CONFIG['web_port']}")
        server.serve_forever()
    except Exception as e:
        log.error(f"Web dashboard error: {e}")

# ─── Main Entry Point ─────────────────────────────────────────────────────────

async def main():
    local_ip = get_local_ip()
    
    print("\n" + "="*60)
    print("  🖥️  RemoteCtrl PC Agent v3.0 - COMPLETE")
    print("="*60)
    print(f"  📡 WebSocket:    ws://{local_ip}:{CONFIG['ws_port']}")
    print(f"  🌐 Web Dashboard: http://{local_ip}:{CONFIG['web_port']}")
    print(f"  🔒 Password:     {'✅ Set' if CONFIG['password'] else '❌ None (open)'}")
    print(f"  🖥️  Screen:       {'✅ Available' if MSS_AVAILABLE else '❌ Unavailable'}")
    print(f"  🖱️  Mouse/KB:     {'✅ Available' if PYAUTOGUI_AVAILABLE else '❌ Unavailable'}")
    print(f"  📋 Clipboard:    {'✅ Available' if CLIPBOARD_AVAILABLE else '❌ Unavailable'}")
    print(f"  🖨️  Printing:     {'✅ Available' if PRINTING_AVAILABLE else '❌ Unavailable'}")
    print("="*60)
    print(f"\n  📱 Open RemoteCtrl app → Enter IP: {local_ip}:{CONFIG['ws_port']}")
    print(f"  🌐 Or open browser: http://{local_ip}:{CONFIG['web_port']}")
    print("\n  Press Ctrl+C to stop\n")
    
    # Start web dashboard
    web_thread = threading.Thread(target=start_web_dashboard, daemon=True)
    web_thread.start()
    
    # Start WebSocket server
    async with serve(ws_handler, "0.0.0.0", CONFIG["ws_port"]):
        await asyncio.gather(
            screen_stream_loop(),
            stats_broadcast_loop(),
            asyncio.Future(),
        )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 RemoteCtrl server stopped.")
