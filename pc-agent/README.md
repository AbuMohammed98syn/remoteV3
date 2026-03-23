# RemoteCtrl PC Agent

This is the Windows-side server that runs on your PC to allow the mobile app to control it.

## Requirements

- Windows 10/11
- Python 3.8+

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python server.py
```

## What it does

The agent starts a WebSocket server on port **8765** and listens for commands from the mobile app.

## Features

| Feature | Required Package |
|---------|-----------------|
| Screen capture & streaming | `mss`, `Pillow` |
| Mouse & keyboard control | `pyautogui` |
| System stats (CPU/RAM/Disk) | `psutil` |
| Process management | `psutil` |
| PowerShell / CMD execution | Built-in |
| File browsing & management | Built-in |
| Win32 API (lock, etc.) | `pywin32` |

## Usage

1. Run `python server.py` on your Windows PC
2. Note the IP address shown (e.g., `192.168.1.100:8765`)
3. Open the mobile app → tap **Connect**
4. Enter the IP and port shown
5. Tap **Connect** — you're in!

## Security Notes

- This server is for **local network use only**
- No authentication is required on the local network (add firewall rules as needed)
- Only run on trusted networks

## Firewall

If Windows Firewall blocks the connection, allow Python through:

```
netsh advfirewall firewall add rule name="RemoteCtrl Agent" dir=in action=allow protocol=TCP localport=8765
```
