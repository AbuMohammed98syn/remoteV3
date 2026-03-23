// ===== WEBSOCKET CONNECTION =====
let ws = null;
let wsReconnectTimer = null;
let currentPath = 'C:\\';
let processes = [];
let stats = {};
const MAX_CHART_POINTS = 60;

// Chart data
const chartData = {
  cpu: [], ram: [], disk: [], netIn: [], netOut: []
};

// Canvas contexts
const charts = {};

// PowerShell quick commands
const PS_COMMANDS = [
  { name: 'Get-Process', desc: 'List running processes' },
  { name: 'Get-Service', desc: 'List all services' },
  { name: 'Get-EventLog -LogName System -Newest 20', desc: 'System event log' },
  { name: 'Get-NetAdapter', desc: 'Network adapters' },
  { name: 'Get-Disk', desc: 'Disk information' },
  { name: 'Get-ComputerInfo', desc: 'Full system info' },
  { name: 'Get-HotFix', desc: 'Installed updates' },
  { name: 'Get-LocalUser', desc: 'Local user accounts' },
  { name: 'Get-NetIPAddress', desc: 'IP addresses' },
  { name: 'Get-NetFirewallRule', desc: 'Firewall rules' },
  { name: 'Get-InstalledModule', desc: 'Installed PS modules' },
  { name: 'Get-ChildItem C:\\ -Recurse', desc: 'List all files' },
  { name: 'Get-WmiObject Win32_Battery', desc: 'Battery info' },
  { name: 'Get-WmiObject Win32_VideoController', desc: 'GPU info' },
  { name: 'Get-WmiObject Win32_Processor', desc: 'CPU info' },
  { name: 'Stop-Process -Name notepad', desc: 'Kill process by name' },
  { name: 'Start-Process notepad', desc: 'Launch Notepad' },
  { name: 'Restart-Service -Name wuauserv', desc: 'Restart Windows Update' },
  { name: 'Clear-RecycleBin -Force', desc: 'Empty Recycle Bin' },
  { name: 'Get-Clipboard', desc: 'Get clipboard content' },
];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  initPSCommands();
  connectWS();
  setupNavigation();
  setupTerminalInput();
  setupPSInput();
  updateServerIP();
  setupRangeInputs();
});

function connectWS() {
  const port = 8765;
  const wsUrl = `ws://${location.hostname}:${port}`;
  updateWSStatus('connecting');

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      updateWSStatus('connected');
      clearTimeout(wsReconnectTimer);
      ws.send(JSON.stringify({ type: 'get_stats' }));
      ws.send(JSON.stringify({ type: 'get_processes' }));
      ws.send(JSON.stringify({ type: 'list_files', data: { path: currentPath } }));
      setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'get_stats' }));
        }
      }, 2000);
      setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'get_processes' }));
        }
      }, 5000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch (e) {}
    };

    ws.onclose = () => {
      updateWSStatus('disconnected');
      wsReconnectTimer = setTimeout(connectWS, 3000);
    };

    ws.onerror = () => {
      updateWSStatus('disconnected');
    };
  } catch (e) {
    updateWSStatus('disconnected');
    wsReconnectTimer = setTimeout(connectWS, 3000);
  }
}

function send(type, data = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'system_stats':
      updateStats(msg.data);
      break;
    case 'processes_list':
      processes = msg.data || [];
      renderProcesses();
      break;
    case 'file_list':
      renderFiles(msg.data);
      break;
    case 'command_output':
      appendTerminalOutput(msg.data.output, msg.data.error);
      break;
    case 'powershell_output':
      appendPSOutput(msg.data.output, msg.data.error);
      break;
    case 'clipboard_content':
      // Handle clipboard
      break;
    case 'connection_update':
      updateConnections(msg.data);
      break;
  }
}

// ===== STATS =====
function updateStats(data) {
  stats = data;

  // Update values
  const cpu = data.cpu || 0;
  const ram = data.ram || 0;
  const disk = data.disk || 0;
  const netIn = data.networkIn || 0;
  const netOut = data.networkOut || 0;

  setEl('cpuValue', `${Math.round(cpu)}%`);
  setEl('ramValue', `${Math.round(ram)}%`);
  setEl('diskValue', `${Math.round(disk)}%`);
  setEl('netValue', formatBytes(netIn));
  setEl('netDown', `↓ ${formatBytes(netIn)}`);
  setEl('netUp', `↑ ${formatBytes(netOut)}`);
  setEl('monCpu', `${Math.round(cpu)}%`);
  setEl('monRam', `${Math.round(ram)}%`);
  setEl('monNet', formatBytes(netIn));

  // Progress bars
  setWidth('cpuBar', cpu);
  setWidth('ramBar', ram);
  setWidth('diskBar', disk);

  // PC info
  if (data.pcName) setEl('pcName', data.pcName);
  if (data.os) setEl('pcOs', data.os);
  if (data.uptime) setEl('pcUptime', data.uptime);
  if (data.ramTotal) setEl('pcRamTotal', `${data.ramTotal.toFixed(1)} GB`);
  if (data.temperature) setEl('pcTemp', `${data.temperature}°C`);

  // Update chart data
  const now = Date.now();
  pushData(chartData.cpu, cpu, now);
  pushData(chartData.ram, ram, now);
  pushData(chartData.disk, disk, now);
  pushData(chartData.netIn, Math.min(netIn / 1024 / 10, 100), now);
  pushData(chartData.netOut, Math.min(netOut / 1024 / 10, 100), now);

  // Redraw charts
  drawChart('cpuChart', chartData.cpu, '#00d4ff');
  drawChart('ramChart', chartData.ram, '#7c3aed');
  drawChart('diskChart', chartData.disk, '#f59e0b');
  drawChart('netChart', chartData.netIn, '#10b981');
  drawBigChart('cpuBigChart', chartData.cpu, '#00d4ff');
  drawBigChart('ramBigChart', chartData.ram, '#7c3aed');
  drawBigChart('netBigChart', chartData.netIn, '#10b981');

  // Color alerts
  colorAlert('cpuCard', cpu, 80, '#00d4ff');
  colorAlert('ramCard', ram, 85, '#7c3aed');
  colorAlert('diskCard', disk, 90, '#f59e0b');
}

function pushData(arr, value, time) {
  arr.push({ value, time });
  if (arr.length > MAX_CHART_POINTS) arr.shift();
}

function colorAlert(cardId, value, threshold, color) {
  const card = document.getElementById(cardId);
  if (!card) return;
  if (value > threshold) {
    card.style.borderColor = '#ef4444';
    card.style.boxShadow = '0 0 0 1px #ef444440';
  } else {
    card.style.borderColor = '';
    card.style.boxShadow = '';
  }
}

// ===== CHARTS =====
function initCharts() {
  ['cpuChart', 'ramChart', 'diskChart', 'netChart', 'cpuBigChart', 'ramBigChart', 'netBigChart'].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) charts[id] = canvas.getContext('2d');
  });
}

function drawChart(id, data, color) {
  const ctx = charts[id];
  const canvas = document.getElementById(id);
  if (!ctx || !canvas || data.length < 2) return;

  const w = canvas.offsetWidth || 200;
  const h = canvas.offsetHeight || 50;
  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0, 0, w, h);

  const pts = data.slice(-MAX_CHART_POINTS);
  const step = w / (pts.length - 1);

  // Fill
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color + '40');
  grad.addColorStop(1, color + '05');
  ctx.beginPath();
  ctx.moveTo(0, h - (pts[0].value / 100) * h);
  pts.forEach((p, i) => ctx.lineTo(i * step, h - (p.value / 100) * h));
  ctx.lineTo((pts.length - 1) * step, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(0, h - (pts[0].value / 100) * h);
  pts.forEach((p, i) => ctx.lineTo(i * step, h - (p.value / 100) * h));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawBigChart(id, data, color) {
  const ctx = charts[id];
  const canvas = document.getElementById(id);
  if (!ctx || !canvas || data.length < 2) return;

  const w = canvas.offsetWidth || 600;
  const h = 120;
  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = '#ffffff10';
  ctx.lineWidth = 1;
  [25, 50, 75].forEach(y => {
    const py = h - (y / 100) * h;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();
  });

  const pts = data.slice(-MAX_CHART_POINTS);
  const step = w / (pts.length - 1);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color + '50');
  grad.addColorStop(1, color + '05');

  ctx.beginPath();
  ctx.moveTo(0, h - (pts[0].value / 100) * h);
  pts.forEach((p, i) => ctx.lineTo(i * step, h - (p.value / 100) * h));
  ctx.lineTo((pts.length - 1) * step, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, h - (pts[0].value / 100) * h);
  pts.forEach((p, i) => ctx.lineTo(i * step, h - (p.value / 100) * h));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// ===== NAVIGATION =====
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      navigateTo(section);
    });
  });
}

function navigateTo(section) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  const navItem = document.querySelector(`[data-section="${section}"]`);
  const sectionEl = document.getElementById(`section-${section}`);

  if (navItem) navItem.classList.add('active');
  if (sectionEl) sectionEl.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', monitor: 'System Monitor', files: 'File Manager',
    terminal: 'Terminal', processes: 'Task Manager', powershell: 'PowerShell',
    connections: 'Connections', settings: 'Settings'
  };
  setEl('pageTitle', titles[section] || section);

  if (section === 'files') refreshFiles();
  if (section === 'processes') requestProcesses();

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('open');
  } else {
    sidebar.classList.toggle('collapsed');
    document.querySelector('.main-content').classList.toggle('full');
  }
}

// ===== TERMINAL =====
let termHistory = [];
let termHistoryIdx = -1;

function setupTerminalInput() {
  const input = document.getElementById('terminalInput');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runTerminalCommand();
    if (e.key === 'ArrowUp') {
      if (termHistoryIdx < termHistory.length - 1) {
        termHistoryIdx++;
        input.value = termHistory[termHistory.length - 1 - termHistoryIdx] || '';
      }
    }
    if (e.key === 'ArrowDown') {
      if (termHistoryIdx > 0) {
        termHistoryIdx--;
        input.value = termHistory[termHistory.length - 1 - termHistoryIdx] || '';
      } else {
        termHistoryIdx = -1;
        input.value = '';
      }
    }
  });
}

function runTerminalCommand() {
  const input = document.getElementById('terminalInput');
  const cmd = input.value.trim();
  if (!cmd) return;

  termHistory.push(cmd);
  termHistoryIdx = -1;
  appendTerminalLine(`${document.getElementById('terminalPrompt').textContent} ${cmd}`, 'cmd-line');
  send('execute_command', { command: cmd });
  input.value = '';
}

function appendTerminalOutput(output, isError) {
  if (output) appendTerminalLine(output, isError ? 'error-line' : 'output-line');
  const out = document.getElementById('terminalOutput');
  if (out) out.scrollTop = out.scrollHeight;
}

function appendTerminalLine(text, cls) {
  const out = document.getElementById('terminalOutput');
  if (!out) return;
  const line = document.createElement('div');
  line.className = cls;
  line.textContent = text;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

function clearTerminal() {
  const out = document.getElementById('terminalOutput');
  if (out) out.innerHTML = '';
}

// ===== POWERSHELL =====
function initPSCommands() {
  const list = document.getElementById('psCommandsList');
  if (!list) return;
  PS_COMMANDS.forEach(cmd => {
    const btn = document.createElement('button');
    btn.className = 'ps-cmd-btn';
    btn.innerHTML = `<span class="ps-cmd-name">${cmd.name}</span><span class="ps-cmd-desc">${cmd.desc}</span>`;
    btn.onclick = () => {
      document.getElementById('psInput').value = cmd.name;
      runPS();
    };
    list.appendChild(btn);
  });
}

function setupPSInput() {
  const input = document.getElementById('psInput');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runPS();
  });
}

function runPS() {
  const input = document.getElementById('psInput');
  const cmd = input.value.trim();
  if (!cmd) return;

  appendPSLine(`PS> ${cmd}`, 'cmd-line');
  send('run_powershell', { command: cmd });
  input.value = '';
}

function appendPSOutput(output, isError) {
  if (output) appendPSLine(output, isError ? 'error-line' : 'output-line');
  const out = document.getElementById('psOutput');
  if (out) out.scrollTop = out.scrollHeight;
}

function appendPSLine(text, cls) {
  const out = document.getElementById('psOutput');
  if (!out) return;
  const line = document.createElement('div');
  line.className = cls;
  line.textContent = text;
  out.appendChild(line);
}

function clearPS() {
  const out = document.getElementById('psOutput');
  if (out) out.innerHTML = '';
}

// ===== FILES =====
function refreshFiles() {
  send('list_files', { path: currentPath });
  document.getElementById('currentPath').textContent = currentPath;
}

function renderFiles(data) {
  const grid = document.getElementById('filesGrid');
  if (!grid) return;

  if (!data || !data.files) {
    grid.innerHTML = '<div class="empty-state">No files found</div>';
    return;
  }

  grid.innerHTML = '';

  // Sort: folders first
  const sorted = [...data.files].sort((a, b) => {
    if (a.is_dir && !b.is_dir) return -1;
    if (!a.is_dir && b.is_dir) return 1;
    return a.name.localeCompare(b.name);
  });

  sorted.forEach(file => {
    const item = document.createElement('div');
    item.className = 'file-item';

    const icon = file.is_dir ? '📁' : getFileIcon(file.name);
    const size = file.is_dir ? '' : formatFileSize(file.size);

    item.innerHTML = `
      <div class="file-icon">${icon}</div>
      <div class="file-name">${file.name}</div>
      ${size ? `<div class="file-size">${size}</div>` : ''}
    `;

    item.addEventListener('click', () => {
      if (file.is_dir) {
        currentPath = file.path;
        refreshFiles();
      } else {
        downloadFile(file.path);
      }
    });

    grid.appendChild(item);
  });
}

function goUp() {
  const parts = currentPath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length > 1) {
    parts.pop();
    currentPath = parts.join('\\') + '\\';
  } else {
    currentPath = 'C:\\';
  }
  refreshFiles();
}

function downloadFile(path) {
  send('download_file', { path });
}

function triggerUpload() {
  document.getElementById('fileUploadInput').click();
}

function uploadFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const b64 = btoa(e.target.result);
    send('upload_file', { path: currentPath + '\\' + file.name, data: b64, filename: file.name });
  };
  reader.readAsBinaryString(file);
}

// ===== PROCESSES =====
function requestProcesses() {
  send('get_processes');
}

function renderProcesses() {
  const tbody = document.getElementById('processesBody');
  if (!tbody) return;

  const search = document.getElementById('processSearch')?.value.toLowerCase() || '';
  const sort = document.getElementById('processSort')?.value || 'cpu';

  let filtered = processes.filter(p => p.name.toLowerCase().includes(search));
  filtered.sort((a, b) => {
    if (sort === 'cpu') return b.cpu - a.cpu;
    if (sort === 'memory') return b.memory - a.memory;
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'pid') return a.pid - b.pid;
    return 0;
  });

  tbody.innerHTML = filtered.slice(0, 50).map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.pid}</td>
      <td class="cpu-badge">${p.cpu.toFixed(1)}%</td>
      <td class="mem-badge">${p.memory.toFixed(1)}%</td>
      <td><span style="color:var(--green);font-size:11px">Running</span></td>
      <td><button class="kill-btn" onclick="killProcess(${p.pid})">Kill</button></td>
    </tr>
  `).join('');
}

function filterProcesses() { renderProcesses(); }
function sortProcesses() { renderProcesses(); }

function killProcess(pid) {
  if (confirm(`Kill process PID ${pid}?`)) {
    send('kill_process', { pid });
    setTimeout(requestProcesses, 500);
  }
}

// ===== POWER COMMANDS =====
function sendPowerCommand(action) {
  const labels = { shutdown: 'Shutdown', restart: 'Restart', sleep: 'Sleep', lock: 'Lock' };
  if (confirm(`${labels[action]} the PC?`)) {
    send('power_action', { action });
  }
}

// ===== CONNECTIONS =====
function updateConnections(data) {
  const list = document.getElementById('connectionsList');
  const badge = document.getElementById('connectedDevices');
  if (!list) return;

  const devices = data.devices || [];
  if (badge) badge.textContent = devices.length;

  if (devices.length === 0) {
    list.innerHTML = '<div class="empty-state">No devices connected</div>';
    return;
  }

  list.innerHTML = devices.map(d => `
    <div class="connection-item">
      <div class="conn-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
      </div>
      <div class="conn-info">
        <div class="conn-name">${d.name || 'Mobile Device'}</div>
        <div class="conn-detail">${d.ip} · Connected ${d.duration || 'just now'}</div>
      </div>
      <span class="conn-badge active">Active</span>
    </div>
  `).join('');
}

// ===== SETTINGS =====
function savePassword() {
  const pwd = document.getElementById('serverPassword').value;
  send('set_password', { password: pwd });
  alert('Password saved!');
}

function setupRangeInputs() {
  const quality = document.getElementById('streamQuality');
  const fps = document.getElementById('streamFps');
  if (quality) {
    quality.addEventListener('input', () => {
      setEl('qualityValue', `${quality.value}%`);
      send('set_stream_quality', { quality: parseInt(quality.value) });
    });
  }
  if (fps) {
    fps.addEventListener('input', () => {
      setEl('fpsValue', `${fps.value} fps`);
      send('set_stream_fps', { fps: parseInt(fps.value) });
    });
  }
}

function updateServerIP() {
  setEl('serverIp', location.hostname);
}

// ===== THEME =====
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
  localStorage.setItem('theme', current === 'dark' ? 'light' : 'dark');
}

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// ===== WS STATUS =====
function updateWSStatus(status) {
  const dot = document.getElementById('wsStatusDot');
  const text = document.getElementById('wsStatusText');
  const serverDot = document.querySelector('.server-status .status-dot');

  const states = {
    connected: { text: 'Connected', color: '#10b981', cls: 'online' },
    connecting: { text: 'Connecting...', color: '#f59e0b', cls: '' },
    disconnected: { text: 'Disconnected', color: '#ef4444', cls: 'offline' },
  };

  const s = states[status] || states.disconnected;
  if (dot) { dot.style.background = s.color; dot.style.boxShadow = `0 0 6px ${s.color}`; }
  if (text) text.textContent = s.text;
  if (serverDot) { serverDot.className = `status-dot ${s.cls}`; }
}

// ===== HELPERS =====
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.min(pct, 100)}%`;
}

function formatBytes(b) {
  if (!b || b === 0) return '0 B/s';
  if (b < 1024) return `${b} B/s`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB/s`;
  return `${(b / 1024 / 1024).toFixed(1)} MB/s`;
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  const icons = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
    ppt: '📋', pptx: '📋', txt: '📃', jpg: '🖼', jpeg: '🖼',
    png: '🖼', gif: '🖼', mp4: '🎬', mp3: '🎵', zip: '📦',
    rar: '📦', exe: '⚙️', py: '🐍', js: '📜', ts: '📜',
    html: '🌐', css: '🎨', json: '📋', xml: '📋',
  };
  return icons[ext] || '📄';
}
