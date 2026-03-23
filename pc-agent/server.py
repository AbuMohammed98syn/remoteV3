#!/usr/bin/env python3
"""
RemoteCtrl PC Agent v2.0
=========================
Full-featured WebSocket server for remote desktop control from mobile.
Includes: screen capture, mouse/keyboard, file manager, terminal, 
          task manager, system monitor, voice/video, web dashboard, auth.

Run: python server.py
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
    from websockets.server import WebSocketServerProtocol
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

# ─── Configuration ───────────────────────────────────────────────────────────
CONFIG = {
    "ws_port": 8765,
    "web_port": 8766,
    "password": "",           # Set a password to require auth
    "screen_quality": 50,     # JPEG quality 1-100
    "screen_fps": 10,         # Max frames per second
    "screen_scale": 0.5,      # Scale factor for screen capture
    "log_level": "INFO",
    "allowed_dirs": [],        # Empty = all dirs allowed
}

# Load config from file if exists
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
connected_clients: Set[WebSocketServerProtocol] = set()
authenticated_clients: Set[WebSocketServerProtocol] = set()
terminal_sessions: Dict[str, subprocess.Popen] = {}
screen_streaming_clients: Set[WebSocketServerProtocol] = set()
server_start_time = time.time()
stats_history = {"cpu": [], "ram": [], "net_in": [], "net_out": []}

# ─── Helpers ─────────────────────────────────────────────────────────────────

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

def is_authenticated(ws: WebSocketServerProtocol) -> bool:
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
    cpu = psutil.cpu_percent(interval=0.1)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    net = psutil.net_io_counters()
    
    # Network speed (requires two measurements)
    net_in = getattr(get_system_stats, "_prev_net_in", 0)
    net_out = getattr(get_system_stats, "_prev_net_out", 0)
    net_time = getattr(get_system_stats, "_prev_time", time.time())
    
    elapsed = time.time() - net_time
    if elapsed > 0:
        in_speed = (net.bytes_recv - net_in) / elapsed
        out_speed = (net.bytes_sent - net_out) / elapsed
    else:
        in_speed = out_speed = 0
    
    get_system_stats._prev_net_in = net.bytes_recv
    get_system_stats._prev_net_out = net.bytes_sent
    get_system_stats._prev_time = time.time()
    
    # Temperature (if available)
    temp = None
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            for name, entries in temps.items():
                if entries:
                    temp = entries[0].current
                    break
    except Exception:
        pass
    
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
        "networkIn": round(max(0, in_speed), 0),
        "networkOut": round(max(0, out_speed), 0),
        "networkInTotal": net.bytes_recv,
        "networkOutTotal": net.bytes_sent,
        "uptime": uptime_str,
        "temperature": temp,
        "pcName": socket.gethostname(),
        "os": f"{platform.system()} {platform.release()}",
        "cpuCount": psutil.cpu_count(),
        "cpuFreq": round(psutil.cpu_freq().current, 0) if psutil.cpu_freq() else 0,
    }

def get_processes(sort_by: str = "cpu", limit: int = 50) -> list:
    procs = []
    for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent", "status"]):
        try:
            info = p.info
            procs.append({
                "pid": info["pid"],
                "name": info["name"] or "Unknown",
                "cpu": round(info["cpu_percent"] or 0, 1),
                "memory": round(info["memory_percent"] or 0, 1),
                "status": info["status"] or "running",
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    
    procs.sort(key=lambda x: x.get(sort_by, 0), reverse=True)
    return procs[:limit]

def capture_screen(quality: int = 50, scale: float = 0.5) -> Optional[str]:
    """Capture screen and return base64 JPEG."""
    if not MSS_AVAILABLE:
        return None
    try:
        with mss.mss() as sct:
            monitor = sct.monitors[1]  # Primary monitor
            screenshot = sct.grab(monitor)
            img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
        
        # Scale down
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
                    "extension": entry.suffix.lower() if not entry.is_dir() else "",
                })
            except (PermissionError, OSError):
                pass
        
        # Get drives on Windows
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
                        drives.append({"letter": d, "path": drive, "total": 0, "free": 0})
        
        return {
            "path": str(p),
            "parent": str(p.parent),
            "items": items,
            "drives": drives,
        }
    except PermissionError:
        return {"error": "Permission denied"}
    except Exception as e:
        return {"error": str(e)}

def execute_powershell(command: str, timeout: int = 30) -> Dict[str, Any]:
    """Execute a PowerShell command."""
    try:
        if platform.system() != "Windows":
            # Try pwsh on Linux/Mac
            ps_cmd = ["pwsh", "-NoProfile", "-NonInteractive", "-Command", command]
        else:
            ps_cmd = [
                "powershell.exe", "-NoProfile", "-NonInteractive",
                "-ExecutionPolicy", "Bypass",
                "-Command", command
            ]
        
        result = subprocess.run(
            ps_cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == "Windows" else 0,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
            "success": result.returncode == 0,
        }
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out", "success": False}
    except FileNotFoundError:
        return {"error": "PowerShell not found", "success": False}
    except Exception as e:
        return {"error": str(e), "success": False}

def execute_cmd(command: str, timeout: int = 30) -> Dict[str, Any]:
    """Execute a CMD command."""
    try:
        if platform.system() == "Windows":
            result = subprocess.run(
                ["cmd.exe", "/c", command],
                capture_output=True, text=True, timeout=timeout,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
        else:
            result = subprocess.run(
                ["/bin/bash", "-c", command],
                capture_output=True, text=True, timeout=timeout,
            )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out"}
    except Exception as e:
        return {"error": str(e)}

# ─── WebSocket Message Handler ────────────────────────────────────────────────

async def handle_message(ws: WebSocketServerProtocol, message: str):
    """Process a single WebSocket message."""
    try:
        msg = json.loads(message)
        msg_type = msg.get("type", "")
        data = msg.get("data", {})
    except json.JSONDecodeError:
        await ws.send(json.dumps({"type": "error", "data": {"message": "Invalid JSON"}}))
        return

    # ── Authentication ────────────────────────────────────────────────────────
    if msg_type == "authenticate":
        pwd = data.get("password", "")
        if not CONFIG["password"] or hash_password(pwd) == hash_password(CONFIG["password"]):
            authenticated_clients.add(ws)
            await ws.send(json.dumps({"type": "auth_success", "data": {"message": "Authenticated"}}))
            log.info(f"Client authenticated: {ws.remote_address}")
        else:
            await ws.send(json.dumps({"type": "auth_failed", "data": {"message": "Wrong password"}}))
        return

    # ── Require auth for all other messages ──────────────────────────────────
    if not is_authenticated(ws):
        await ws.send(json.dumps({"type": "auth_required", "data": {}}))
        return

    # ── Ping/Pong ─────────────────────────────────────────────────────────────
    if msg_type == "ping":
        await ws.send(json.dumps({"type": "pong", "data": {"time": time.time()}}))

    # ── System Stats ──────────────────────────────────────────────────────────
    elif msg_type in ("get_stats", "get_system_info"):
        stats = get_system_stats()
        await ws.send(json.dumps({"type": "system_stats", "data": stats}))

    # ── Processes ─────────────────────────────────────────────────────────────
    elif msg_type == "get_processes":
        sort_by = data.get("sort_by", "cpu") if isinstance(data, dict) else "cpu"
        procs = get_processes(sort_by)
        await ws.send(json.dumps({"type": "processes_list", "data": procs}))

    elif msg_type == "kill_process":
        pid = data.get("pid") if isinstance(data, dict) else None
        if pid:
            try:
                p = psutil.Process(int(pid))
                p.kill()
                await ws.send(json.dumps({"type": "kill_result", "data": {"success": True, "pid": pid}}))
            except Exception as e:
                await ws.send(json.dumps({"type": "kill_result", "data": {"success": False, "error": str(e)}}))

    # ── Screen Capture ────────────────────────────────────────────────────────
    elif msg_type == "get_screen":
        quality = data.get("quality", CONFIG["screen_quality"]) if isinstance(data, dict) else CONFIG["screen_quality"]
        scale = data.get("scale", CONFIG["screen_scale"]) if isinstance(data, dict) else CONFIG["screen_scale"]
        frame = capture_screen(quality, scale)
        if frame:
            await ws.send(json.dumps({"type": "screen_frame", "data": {"frame": frame, "timestamp": time.time()}}))
        else:
            await ws.send(json.dumps({"type": "screen_frame", "data": {"error": "Screen capture unavailable"}}))

    elif msg_type == "start_screen_stream":
        screen_streaming_clients.add(ws)
        await ws.send(json.dumps({"type": "stream_started", "data": {}}))

    elif msg_type == "stop_screen_stream":
        screen_streaming_clients.discard(ws)
        await ws.send(json.dumps({"type": "stream_stopped", "data": {}}))

    # ── Mouse Control ─────────────────────────────────────────────────────────
    elif msg_type == "mouse_move":
        if PYAUTOGUI_AVAILABLE and isinstance(data, dict):
            dx = data.get("dx", 0)
            dy = data.get("dy", 0)
            x, y = pyautogui.position()
            pyautogui.moveTo(x + dx, y + dy, duration=0)

    elif msg_type == "mouse_click":
        if PYAUTOGUI_AVAILABLE and isinstance(data, dict):
            button = data.get("button", "left")
            double = data.get("double", False)
            x = data.get("x")
            y = data.get("y")
            if x is not None and y is not None:
                if double:
                    pyautogui.doubleClick(x, y, button=button)
                else:
                    pyautogui.click(x, y, button=button)
            else:
                if double:
                    pyautogui.doubleClick(button=button)
                else:
                    pyautogui.click(button=button)

    elif msg_type == "mouse_scroll":
        if PYAUTOGUI_AVAILABLE and isinstance(data, dict):
            amount = data.get("amount", 3)
            direction = data.get("direction", "up")
            clicks = amount if direction == "up" else -amount
            pyautogui.scroll(clicks)

    elif msg_type == "mouse_drag":
        if PYAUTOGUI_AVAILABLE and isinstance(data, dict):
            x1, y1 = data.get("x1", 0), data.get("y1", 0)
            x2, y2 = data.get("x2", 0), data.get("y2", 0)
            pyautogui.drag(x2 - x1, y2 - y1, duration=0.1, relative=True)

    # ── Keyboard Control ──────────────────────────────────────────────────────
    elif msg_type == "key_press":
        if PYAUTOGUI_AVAILABLE and isinstance(data, dict):
            key = data.get("key", "")
            if key:
                try:
                    pyautogui.press(key)
                except Exception as e:
                    log.warning(f"Key press error: {e}")

    elif msg_type == "key_combination":
        if PYAUTOGUI_AVAILABLE and isinstance(data, dict):
            keys = data.get("keys", [])
            if keys:
                try:
                    pyautogui.hotkey(*keys)
                except Exception as e:
                    log.warning(f"Hotkey error: {e}")

    elif msg_type == "type_text":
        if PYAUTOGUI_AVAILABLE and isinstance(data, dict):
            text = data.get("text", "")
            if text:
                try:
                    pyautogui.typewrite(text, interval=0.02)
                except Exception:
                    # Fallback for unicode
                    import pyperclip
                    pyperclip.copy(text)
                    pyautogui.hotkey("ctrl", "v")

    # ── Drawing ───────────────────────────────────────────────────────────────
    elif msg_type == "draw_stroke":
        if PYAUTOGUI_AVAILABLE and isinstance(data, dict):
            points = data.get("points", [])
            screen_w = data.get("screenW", 1920)
            screen_h = data.get("screenH", 1080)
            actual_w, actual_h = pyautogui.size()
            
            if points and len(points) >= 2:
                scale_x = actual_w / screen_w
                scale_y = actual_h / screen_h
                start = points[0]
                sx = int(start["x"] * scale_x)
                sy = int(start["y"] * scale_y)
                pyautogui.moveTo(sx, sy)
                pyautogui.mouseDown()
                for pt in points[1:]:
                    px = int(pt["x"] * scale_x)
                    py = int(pt["y"] * scale_y)
                    pyautogui.moveTo(px, py, duration=0.01)
                pyautogui.mouseUp()

    # ── File Manager ──────────────────────────────────────────────────────────
    elif msg_type == "list_directory":
        path = data.get("path", os.path.expanduser("~")) if isinstance(data, dict) else os.path.expanduser("~")
        result = list_directory(path)
        await ws.send(json.dumps({"type": "directory_listing", "data": result}))

    elif msg_type == "get_drives":
        drives = []
        if platform.system() == "Windows":
            import string
            for d in string.ascii_uppercase:
                drive = f"{d}:\\"
                if os.path.exists(drive):
                    try:
                        usage = psutil.disk_usage(drive)
                        drives.append({
                            "letter": d, "path": drive,
                            "total": round(usage.total / (1024**3), 1),
                            "free": round(usage.free / (1024**3), 1),
                            "used": round(usage.used / (1024**3), 1),
                        })
                    except Exception:
                        pass
        else:
            usage = psutil.disk_usage("/")
            drives.append({
                "letter": "/", "path": "/",
                "total": round(usage.total / (1024**3), 1),
                "free": round(usage.free / (1024**3), 1),
            })
        await ws.send(json.dumps({"type": "drives_list", "data": drives}))

    elif msg_type == "read_file":
        path = data.get("path", "") if isinstance(data, dict) else ""
        try:
            p = Path(path)
            if p.exists() and p.is_file():
                with open(p, "rb") as f:
                    content = base64.b64encode(f.read()).decode()
                await ws.send(json.dumps({
                    "type": "file_content",
                    "data": {"path": path, "content": content, "size": p.stat().st_size}
                }))
            else:
                await ws.send(json.dumps({"type": "file_content", "data": {"error": "File not found"}}))
        except Exception as e:
            await ws.send(json.dumps({"type": "file_content", "data": {"error": str(e)}}))

    elif msg_type == "write_file":
        if isinstance(data, dict):
            path = data.get("path", "")
            content_b64 = data.get("content", "")
            try:
                p = Path(path)
                p.parent.mkdir(parents=True, exist_ok=True)
                with open(p, "wb") as f:
                    f.write(base64.b64decode(content_b64))
                await ws.send(json.dumps({"type": "write_result", "data": {"success": True, "path": path}}))
            except Exception as e:
                await ws.send(json.dumps({"type": "write_result", "data": {"success": False, "error": str(e)}}))

    elif msg_type == "delete_file":
        path = data.get("path", "") if isinstance(data, dict) else ""
        try:
            p = Path(path)
            if p.is_dir():
                shutil.rmtree(p)
            else:
                p.unlink()
            await ws.send(json.dumps({"type": "delete_result", "data": {"success": True}}))
        except Exception as e:
            await ws.send(json.dumps({"type": "delete_result", "data": {"success": False, "error": str(e)}}))

    elif msg_type == "create_folder":
        path = data.get("path", "") if isinstance(data, dict) else ""
        try:
            Path(path).mkdir(parents=True, exist_ok=True)
            await ws.send(json.dumps({"type": "create_folder_result", "data": {"success": True}}))
        except Exception as e:
            await ws.send(json.dumps({"type": "create_folder_result", "data": {"success": False, "error": str(e)}}))

    elif msg_type == "open_file":
        path = data.get("path", "") if isinstance(data, dict) else ""
        try:
            if platform.system() == "Windows":
                os.startfile(path)
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", path])
            else:
                subprocess.Popen(["xdg-open", path])
            await ws.send(json.dumps({"type": "open_result", "data": {"success": True}}))
        except Exception as e:
            await ws.send(json.dumps({"type": "open_result", "data": {"success": False, "error": str(e)}}))

    elif msg_type == "print_file":
        path = data.get("path", "") if isinstance(data, dict) else ""
        try:
            if platform.system() == "Windows":
                os.startfile(path, "print")
                await ws.send(json.dumps({"type": "print_result", "data": {"success": True}}))
            else:
                subprocess.Popen(["lp", path])
                await ws.send(json.dumps({"type": "print_result", "data": {"success": True}}))
        except Exception as e:
            await ws.send(json.dumps({"type": "print_result", "data": {"success": False, "error": str(e)}}))

    # ── PowerShell ────────────────────────────────────────────────────────────
    elif msg_type == "powershell":
        command = data.get("command", "") if isinstance(data, dict) else str(data)
        if command:
            result = execute_powershell(command)
            await ws.send(json.dumps({"type": "powershell_result", "data": result}))

    # ── Terminal (CMD) ────────────────────────────────────────────────────────
    elif msg_type == "terminal_command":
        command = data.get("command", "") if isinstance(data, dict) else str(data)
        session_id = data.get("session_id", "default") if isinstance(data, dict) else "default"
        if command:
            result = execute_cmd(command)
            await ws.send(json.dumps({
                "type": "terminal_output",
                "data": {**result, "session_id": session_id, "command": command}
            }))

    # ── Clipboard ─────────────────────────────────────────────────────────────
    elif msg_type == "get_clipboard":
        if CLIPBOARD_AVAILABLE:
            try:
                content = pyperclip.paste()
                await ws.send(json.dumps({"type": "clipboard_content", "data": {"text": content}}))
            except Exception as e:
                await ws.send(json.dumps({"type": "clipboard_content", "data": {"error": str(e)}}))

    elif msg_type == "set_clipboard":
        if CLIPBOARD_AVAILABLE and isinstance(data, dict):
            text = data.get("text", "")
            try:
                pyperclip.copy(text)
                await ws.send(json.dumps({"type": "clipboard_set", "data": {"success": True}}))
            except Exception as e:
                await ws.send(json.dumps({"type": "clipboard_set", "data": {"success": False, "error": str(e)}}))

    # ── Power Controls ────────────────────────────────────────────────────────
    elif msg_type == "power_action":
        action = data.get("action", "") if isinstance(data, dict) else str(data)
        delay = data.get("delay", 0) if isinstance(data, dict) else 0
        
        try:
            if platform.system() == "Windows":
                cmds = {
                    "shutdown": f"shutdown /s /t {delay}",
                    "restart": f"shutdown /r /t {delay}",
                    "sleep": "rundll32.exe powrprof.dll,SetSuspendState 0,1,0",
                    "hibernate": "shutdown /h",
                    "lock": "rundll32.exe user32.dll,LockWorkStation",
                    "cancel_shutdown": "shutdown /a",
                    "logoff": "shutdown /l",
                }
            else:
                cmds = {
                    "shutdown": f"sudo shutdown -h +{delay//60 or 'now'}",
                    "restart": f"sudo shutdown -r +{delay//60 or 'now'}",
                    "sleep": "systemctl suspend",
                    "lock": "loginctl lock-session",
                }
            
            cmd = cmds.get(action)
            if cmd:
                subprocess.Popen(cmd, shell=True)
                await ws.send(json.dumps({"type": "power_result", "data": {"success": True, "action": action}}))
            else:
                await ws.send(json.dumps({"type": "power_result", "data": {"success": False, "error": f"Unknown action: {action}"}}))
        except Exception as e:
            await ws.send(json.dumps({"type": "power_result", "data": {"success": False, "error": str(e)}}))

    # ── Open Applications ─────────────────────────────────────────────────────
    elif msg_type == "open_app":
        app = data.get("app", "") if isinstance(data, dict) else str(data)
        try:
            if platform.system() == "Windows":
                apps = {
                    "task_manager": "taskmgr",
                    "cmd": "cmd",
                    "powershell": "powershell",
                    "explorer": "explorer",
                    "notepad": "notepad",
                    "calculator": "calc",
                    "control_panel": "control",
                    "device_manager": "devmgmt.msc",
                    "disk_management": "diskmgmt.msc",
                    "event_viewer": "eventvwr",
                    "registry": "regedit",
                    "services": "services.msc",
                }
                cmd = apps.get(app, app)
                subprocess.Popen(cmd, shell=True)
            await ws.send(json.dumps({"type": "open_app_result", "data": {"success": True, "app": app}}))
        except Exception as e:
            await ws.send(json.dumps({"type": "open_app_result", "data": {"success": False, "error": str(e)}}))

    # ── Screen Info ───────────────────────────────────────────────────────────
    elif msg_type == "get_screen_info":
        if PYAUTOGUI_AVAILABLE:
            w, h = pyautogui.size()
            await ws.send(json.dumps({"type": "screen_info", "data": {"width": w, "height": h}}))

    # ── Notifications ─────────────────────────────────────────────────────────
    elif msg_type == "show_notification":
        if isinstance(data, dict):
            title = data.get("title", "RemoteCtrl")
            message = data.get("message", "")
            try:
                if platform.system() == "Windows":
                    subprocess.Popen([
                        "powershell", "-Command",
                        f'[System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms");'
                        f'$notify = New-Object System.Windows.Forms.NotifyIcon;'
                        f'$notify.Icon = [System.Drawing.SystemIcons]::Information;'
                        f'$notify.Visible = $True;'
                        f'$notify.ShowBalloonTip(3000, "{title}", "{message}", [System.Windows.Forms.ToolTipIcon]::Info);'
                    ], shell=True)
                await ws.send(json.dumps({"type": "notification_sent", "data": {"success": True}}))
            except Exception as e:
                await ws.send(json.dumps({"type": "notification_sent", "data": {"success": False, "error": str(e)}}))

    else:
        log.debug(f"Unknown message type: {msg_type}")

# ─── Screen Streaming Loop ────────────────────────────────────────────────────

async def screen_stream_loop():
    """Continuously send screen frames to streaming clients."""
    global screen_streaming_clients
    frame_interval = 1.0 / CONFIG["screen_fps"]
    while True:
        if screen_streaming_clients:
            frame = capture_screen(CONFIG["screen_quality"], CONFIG["screen_scale"])
            if frame:
                msg = json.dumps({"type": "screen_frame", "data": {"frame": frame, "timestamp": time.time()}})
                dead = set()
                for ws in list(screen_streaming_clients):
                    try:
                        await ws.send(msg)
                    except Exception:
                        dead.add(ws)
                screen_streaming_clients -= dead
        await asyncio.sleep(frame_interval)

# ─── Stats Broadcast Loop ─────────────────────────────────────────────────────

async def stats_broadcast_loop():
    """Broadcast system stats to all connected clients every 3 seconds."""
    global authenticated_clients, connected_clients
    while True:
        await asyncio.sleep(3)
        if authenticated_clients or (not CONFIG["password"] and connected_clients):
            try:
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

# ─── WebSocket Connection Handler ─────────────────────────────────────────────

async def ws_handler(ws: WebSocketServerProtocol):
    """Handle a new WebSocket connection."""
    addr = ws.remote_address
    log.info(f"🔗 New connection from {addr}")
    connected_clients.add(ws)

    # Send welcome message
    welcome = {
        "type": "connected",
        "data": {
            "version": "2.0",
            "auth_required": bool(CONFIG["password"]),
            "server": socket.gethostname(),
            "os": platform.system(),
            "features": ["screen", "mouse", "keyboard", "files", "terminal", "powershell", "monitor", "power", "clipboard"],
        }
    }
    await ws.send(json.dumps(welcome))

    # If no password, auto-authenticate
    if not CONFIG["password"]:
        authenticated_clients.add(ws)

    try:
        async for message in ws:
            await handle_message(ws, message)
    except websockets.exceptions.ConnectionClosed:
        log.info(f"❌ Connection closed: {addr}")
    except Exception as e:
        log.error(f"Connection error {addr}: {e}")
    finally:
        connected_clients.discard(ws)
        authenticated_clients.discard(ws)
        screen_streaming_clients.discard(ws)

# ─── Web Dashboard ────────────────────────────────────────────────────────────

WEB_DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RemoteCtrl Dashboard</title>
<style>
  :root { --bg: #0d1117; --surface: #161b22; --border: #30363d; --primary: #00d4ff; --text: #e6edf3; --muted: #8b949e; --success: #3fb950; --warning: #d29922; --error: #f85149; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #00d4ff, #7c3aed); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .logo-text { font-size: 20px; font-weight: 700; }
  .status-badge { display: flex; align-items: center; gap: 8px; background: rgba(63,185,80,0.15); border: 1px solid rgba(63,185,80,0.3); padding: 6px 14px; border-radius: 20px; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  .card-title { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
  .metric { font-size: 36px; font-weight: 700; color: var(--primary); }
  .metric-label { font-size: 12px; color: var(--muted); margin-top: 4px; }
  .progress-bar { height: 6px; background: #21262d; border-radius: 3px; overflow: hidden; margin-top: 10px; }
  .progress-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
  .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: var(--muted); }
  .info-value { font-weight: 500; }
  .process-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .process-table th { text-align: left; padding: 8px 12px; color: var(--muted); font-weight: 600; border-bottom: 1px solid var(--border); }
  .process-table td { padding: 8px 12px; border-bottom: 1px solid rgba(48,54,61,0.5); }
  .process-table tr:hover td { background: rgba(255,255,255,0.03); }
  .btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; transition: opacity 0.2s; }
  .btn:hover { opacity: 0.85; }
  .btn-primary { background: var(--primary); color: #000; }
  .btn-danger { background: var(--error); color: #fff; }
  .btn-warning { background: var(--warning); color: #000; }
  .terminal { background: #010409; border: 1px solid var(--border); border-radius: 8px; padding: 16px; font-family: 'Courier New', monospace; font-size: 13px; min-height: 200px; max-height: 400px; overflow-y: auto; }
  .terminal-output { color: #7ee787; white-space: pre-wrap; word-break: break-all; }
  .terminal-input { display: flex; gap: 8px; margin-top: 12px; }
  .terminal-input input { flex: 1; background: #010409; border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; color: var(--text); font-family: monospace; font-size: 13px; }
  .terminal-input input:focus { outline: none; border-color: var(--primary); }
  .conn-info { background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2); border-radius: 10px; padding: 16px; margin-bottom: 24px; }
  .conn-info h3 { color: var(--primary); margin-bottom: 10px; }
  .conn-detail { display: flex; gap: 24px; flex-wrap: wrap; }
  .conn-item { display: flex; flex-direction: column; gap: 4px; }
  .conn-item .label { font-size: 11px; color: var(--muted); text-transform: uppercase; }
  .conn-item .value { font-size: 16px; font-weight: 700; color: var(--text); font-family: monospace; }
  .qr-hint { font-size: 12px; color: var(--muted); margin-top: 8px; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">
    <div class="logo-icon">🖥️</div>
    <span class="logo-text">RemoteCtrl</span>
  </div>
  <div class="status-badge">
    <div class="status-dot"></div>
    <span style="font-size:13px;font-weight:600;color:var(--success)">Server Running</span>
  </div>
</div>

<div class="container">
  <!-- Connection Info -->
  <div class="conn-info">
    <h3>📱 Connect Your Phone</h3>
    <div class="conn-detail">
      <div class="conn-item">
        <span class="label">IP Address</span>
        <span class="value" id="localIp">Loading...</span>
      </div>
      <div class="conn-item">
        <span class="label">WebSocket Port</span>
        <span class="value">__WS_PORT__</span>
      </div>
      <div class="conn-item">
        <span class="label">Web Dashboard</span>
        <span class="value">__WEB_PORT__</span>
      </div>
      <div class="conn-item">
        <span class="label">Auth</span>
        <span class="value" id="authStatus">Loading...</span>
      </div>
    </div>
    <p class="qr-hint">Open RemoteCtrl app → Connect → Enter the IP address above → Port __WS_PORT__</p>
  </div>

  <!-- Stats Grid -->
  <div class="grid">
    <div class="card">
      <div class="card-title">CPU Usage</div>
      <div class="metric" id="cpuVal">--</div>
      <div class="metric-label" id="cpuLabel">Loading...</div>
      <div class="progress-bar"><div class="progress-fill" id="cpuBar" style="background:#00d4ff;width:0%"></div></div>
    </div>
    <div class="card">
      <div class="card-title">RAM Usage</div>
      <div class="metric" id="ramVal">--</div>
      <div class="metric-label" id="ramLabel">Loading...</div>
      <div class="progress-bar"><div class="progress-fill" id="ramBar" style="background:#7c3aed;width:0%"></div></div>
    </div>
    <div class="card">
      <div class="card-title">Disk Usage</div>
      <div class="metric" id="diskVal">--</div>
      <div class="metric-label" id="diskLabel">Loading...</div>
      <div class="progress-bar"><div class="progress-fill" id="diskBar" style="background:#f59e0b;width:0%"></div></div>
    </div>
    <div class="card">
      <div class="card-title">Network</div>
      <div class="metric" id="netIn">--</div>
      <div class="metric-label">↓ Download</div>
      <div style="margin-top:8px;font-size:20px;font-weight:700;color:#10b981" id="netOut">--</div>
      <div class="metric-label">↑ Upload</div>
    </div>
  </div>

  <!-- System Info + Processes -->
  <div class="grid" style="grid-template-columns: 1fr 2fr;">
    <div class="card">
      <div class="card-title">System Info</div>
      <div id="sysInfo">
        <div class="info-row"><span class="info-label">PC Name</span><span class="info-value" id="pcName">--</span></div>
        <div class="info-row"><span class="info-label">OS</span><span class="info-value" id="osName">--</span></div>
        <div class="info-row"><span class="info-label">Uptime</span><span class="info-value" id="uptime">--</span></div>
        <div class="info-row"><span class="info-label">CPU Cores</span><span class="info-value" id="cpuCores">--</span></div>
        <div class="info-row"><span class="info-label">CPU Freq</span><span class="info-value" id="cpuFreq">--</span></div>
        <div class="info-row"><span class="info-label">Temperature</span><span class="info-value" id="temp">--</span></div>
        <div class="info-row"><span class="info-label">Connected Clients</span><span class="info-value" id="clients">0</span></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        Top Processes
        <button class="btn btn-primary" onclick="refreshProcesses()" style="font-size:11px;padding:4px 10px">Refresh</button>
      </div>
      <table class="process-table">
        <thead><tr><th>Name</th><th>PID</th><th>CPU %</th><th>RAM %</th><th>Action</th></tr></thead>
        <tbody id="processTable"></tbody>
      </table>
    </div>
  </div>

  <!-- Terminal -->
  <div class="card" style="margin-bottom:16px">
    <div class="card-title">Quick Terminal</div>
    <div class="terminal" id="termOutput"><span class="terminal-output">RemoteCtrl Terminal Ready. Type a command below.\n</span></div>
    <div class="terminal-input">
      <input type="text" id="termInput" placeholder="Enter command (PowerShell)..." onkeydown="if(event.key==='Enter')runCmd()">
      <button class="btn btn-primary" onclick="runCmd()">Run</button>
      <button class="btn" style="background:#21262d" onclick="document.getElementById('termOutput').innerHTML='<span class=terminal-output>Cleared.\n</span>'">Clear</button>
    </div>
  </div>

  <!-- Power Controls -->
  <div class="card">
    <div class="card-title">Power Controls</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-danger" onclick="powerAction('shutdown')">⏻ Shutdown</button>
      <button class="btn btn-warning" onclick="powerAction('restart')">🔄 Restart</button>
      <button class="btn" style="background:#21262d" onclick="powerAction('sleep')">💤 Sleep</button>
      <button class="btn" style="background:#21262d" onclick="powerAction('lock')">🔒 Lock</button>
      <button class="btn" style="background:#21262d" onclick="powerAction('hibernate')">🌙 Hibernate</button>
    </div>
  </div>
</div>

<script>
const WS_PORT = __WS_PORT__;
const WEB_PORT = __WEB_PORT__;
let ws = null;
let statsInterval = null;

function connect() {
  const ip = window.location.hostname;
  document.getElementById('localIp').textContent = ip;
  document.getElementById('authStatus').textContent = 'No Password';
  
  ws = new WebSocket(`ws://${ip}:${WS_PORT}`);
  ws.onopen = () => {
    console.log('Connected to RemoteCtrl server');
    ws.send(JSON.stringify({type: 'get_stats'}));
    ws.send(JSON.stringify({type: 'get_processes'}));
    statsInterval = setInterval(() => {
      ws.send(JSON.stringify({type: 'get_stats'}));
    }, 2000);
  };
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'system_stats' || msg.type === 'stats') updateStats(msg.data);
    if (msg.type === 'processes_list' || msg.type === 'processes') updateProcesses(msg.data);
    if (msg.type === 'powershell_result' || msg.type === 'terminal_output') appendTerminal(msg.data);
    if (msg.type === 'connected') {
      document.getElementById('authStatus').textContent = msg.data.auth_required ? 'Password Required' : 'No Password';
    }
  };
  ws.onclose = () => {
    clearInterval(statsInterval);
    setTimeout(connect, 3000);
  };
}

function updateStats(d) {
  document.getElementById('cpuVal').textContent = d.cpu + '%';
  document.getElementById('cpuLabel').textContent = `${d.cpuCount} cores @ ${d.cpuFreq} MHz`;
  document.getElementById('cpuBar').style.width = d.cpu + '%';
  document.getElementById('cpuBar').style.background = d.cpu > 80 ? '#f85149' : '#00d4ff';
  
  document.getElementById('ramVal').textContent = d.ram + '%';
  document.getElementById('ramLabel').textContent = `${d.ramUsed?.toFixed(1)} / ${d.ramTotal?.toFixed(1)} GB`;
  document.getElementById('ramBar').style.width = d.ram + '%';
  document.getElementById('ramBar').style.background = d.ram > 85 ? '#f85149' : '#7c3aed';
  
  document.getElementById('diskVal').textContent = d.disk + '%';
  document.getElementById('diskLabel').textContent = `${d.diskUsed?.toFixed(0)} / ${d.diskTotal?.toFixed(0)} GB`;
  document.getElementById('diskBar').style.width = d.disk + '%';
  
  document.getElementById('netIn').textContent = fmtBytes(d.networkIn) + '/s';
  document.getElementById('netOut').textContent = fmtBytes(d.networkOut) + '/s';
  
  document.getElementById('pcName').textContent = d.pcName || '--';
  document.getElementById('osName').textContent = d.os || '--';
  document.getElementById('uptime').textContent = d.uptime || '--';
  document.getElementById('cpuCores').textContent = d.cpuCount || '--';
  document.getElementById('cpuFreq').textContent = d.cpuFreq ? d.cpuFreq + ' MHz' : '--';
  document.getElementById('temp').textContent = d.temperature ? d.temperature + '°C' : 'N/A';
}

function updateProcesses(procs) {
  const tbody = document.getElementById('processTable');
  tbody.innerHTML = (procs || []).slice(0, 15).map(p => `
    <tr>
      <td>${p.name}</td>
      <td style="color:var(--muted)">${p.pid}</td>
      <td style="color:${p.cpu > 50 ? 'var(--error)' : 'var(--primary)'}">${p.cpu.toFixed(1)}%</td>
      <td>${p.memory.toFixed(1)}%</td>
      <td><button class="btn btn-danger" style="font-size:11px;padding:3px 8px" onclick="killProc(${p.pid})">Kill</button></td>
    </tr>
  `).join('');
}

function appendTerminal(data) {
  const out = document.getElementById('termOutput');
  const text = data.stdout || data.stderr || data.error || JSON.stringify(data);
  out.innerHTML += `<span class="terminal-output">${escHtml(text)}\n</span>`;
  out.scrollTop = out.scrollHeight;
}

function runCmd() {
  const input = document.getElementById('termInput');
  const cmd = input.value.trim();
  if (!cmd || !ws) return;
  const out = document.getElementById('termOutput');
  out.innerHTML += `<span style="color:#58a6ff">PS> ${escHtml(cmd)}\n</span>`;
  ws.send(JSON.stringify({type: 'powershell', data: {command: cmd}}));
  input.value = '';
}

function killProc(pid) {
  if (!ws) return;
  if (confirm(`Kill process ${pid}?`)) {
    ws.send(JSON.stringify({type: 'kill_process', data: {pid}}));
    setTimeout(refreshProcesses, 1000);
  }
}

function refreshProcesses() {
  if (ws) ws.send(JSON.stringify({type: 'get_processes'}));
}

function powerAction(action) {
  const labels = {shutdown:'Shutdown',restart:'Restart',sleep:'Sleep',lock:'Lock',hibernate:'Hibernate'};
  if (!confirm(`${labels[action]} this PC?`)) return;
  if (ws) ws.send(JSON.stringify({type: 'power_action', data: {action}}));
}

function fmtBytes(b) {
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1024*1024) return (b/1024).toFixed(1) + ' KB';
  return (b/1024/1024).toFixed(1) + ' MB';
}

function escHtml(t) {
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

connect();
</script>
</body>
</html>
""".replace("__WS_PORT__", str(CONFIG["ws_port"])).replace("__WEB_PORT__", str(CONFIG["web_port"]))


class WebDashboardHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(WEB_DASHBOARD_HTML.encode())

    def log_message(self, format, *args):
        pass  # Suppress HTTP logs


def start_web_dashboard():
    """Start the web dashboard HTTP server."""
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
    print("  🖥️  RemoteCtrl PC Agent v2.0")
    print("="*60)
    print(f"  📡 WebSocket:    ws://{local_ip}:{CONFIG['ws_port']}")
    print(f"  🌐 Web Dashboard: http://{local_ip}:{CONFIG['web_port']}")
    print(f"  🔒 Password:     {'✅ Set' if CONFIG['password'] else '❌ None (open)'}")
    print(f"  🖥️  Screen:       {'✅ Available' if MSS_AVAILABLE else '❌ Unavailable'}")
    print(f"  🖱️  Mouse/KB:     {'✅ Available' if PYAUTOGUI_AVAILABLE else '❌ Unavailable'}")
    print(f"  📋 Clipboard:    {'✅ Available' if CLIPBOARD_AVAILABLE else '❌ Unavailable'}")
    print("="*60)
    print(f"\n  📱 Open RemoteCtrl app → Enter IP: {local_ip}")
    print(f"  🌐 Or open browser: http://{local_ip}:{CONFIG['web_port']}")
    print("\n  Press Ctrl+C to stop\n")
    
    # Start web dashboard in background thread
    web_thread = threading.Thread(target=start_web_dashboard, daemon=True)
    web_thread.start()
    
    # Start WebSocket server + background tasks
    async with websockets.serve(ws_handler, "0.0.0.0", CONFIG["ws_port"]):
        await asyncio.gather(
            screen_stream_loop(),
            stats_broadcast_loop(),
            asyncio.Future(),  # Run forever
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 RemoteCtrl server stopped.")
