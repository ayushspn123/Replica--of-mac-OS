/* macOS Web — Electron entry point.
   Opens maximized (taskbar stays visible), F11 = fullscreen, Ctrl+Q = quit.
   Exposes real-filesystem and app-launching IPC used by Finder, Launchpad,
   Spotlight and the desktop. */
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");

const HOME = process.env.USERPROFILE || os.homedir();

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 820,
    minHeight: 540,
    frame: false,
    fullscreen: true,
    backgroundColor: "#000000",
    title: "macOS",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "index.html"));

  win.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
    if ((input.control || input.meta) && input.key.toLowerCase() === "q") {
      e.preventDefault();
      app.quit();
    }
  });
}

/* ───────── IPC: real Windows integration ───────── */
ipcMain.handle("native:readDir", (e, p) => {
  try {
    return fs
      .readdirSync(p, { withFileTypes: true })
      .filter((d) => !d.name.startsWith(".") && !/^(ntuser|desktop\.ini|thumbs\.db|\$)/i.test(d.name))
      .slice(0, 500)
      .map((d) => ({ name: d.name, dir: d.isDirectory() }));
  } catch (err) {
    return { error: String((err && err.message) || err) };
  }
});

ipcMain.handle("native:openPath", (e, p) => shell.openPath(p));
ipcMain.handle("native:reveal", (e, p) => shell.showItemInFolder(p));

ipcMain.handle("native:launch", (e, p) => {
  try {
    if (/\.exe$/i.test(p)) spawn(p, [], { detached: true, stdio: "ignore" }).unref();
    else shell.openPath(p);
    return true;
  } catch (err) {
    return String(err);
  }
});

ipcMain.handle("native:detectApps", () => {
  const PF = process.env["ProgramFiles"] || "C:\\Program Files";
  const PF86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const LAD = process.env.LOCALAPPDATA || "";
  const APD = process.env.APPDATA || "";
  const candidates = [
    { name: "VS Code", emoji: "💙", bg: "linear-gradient(180deg,#2db7f5,#0a66c2)", path: path.join(LAD, "Programs", "Microsoft VS Code", "Code.exe") },
    { name: "VS Code", emoji: "💙", bg: "linear-gradient(180deg,#2db7f5,#0a66c2)", path: path.join(PF, "Microsoft VS Code", "Code.exe") },
    { name: "Chrome", emoji: "🌐", bg: "linear-gradient(180deg,#ffffff,#dfe3e8)", path: path.join(PF, "Google", "Chrome", "Application", "chrome.exe") },
    { name: "Edge", emoji: "🌊", bg: "linear-gradient(180deg,#79d3ff,#0b556d)", path: path.join(PF86, "Microsoft", "Edge", "Application", "msedge.exe") },
    { name: "Notepad", emoji: "📝", bg: "linear-gradient(180deg,#9fd4f5,#4d8fc4)", path: "C:\\Windows\\System32\\notepad.exe" },
    { name: "Paint", emoji: "🎨", bg: "linear-gradient(180deg,#ffffff,#ffd9e8)", path: "C:\\Windows\\System32\\mspaint.exe" },
    { name: "File Explorer", emoji: "📁", bg: "linear-gradient(180deg,#ffd97a,#f5b83d)", path: "C:\\Windows\\explorer.exe" },
    { name: "PowerShell", emoji: "🟦", bg: "linear-gradient(180deg,#3d6ea5,#1c3a5e)", path: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" },
    { name: "Word", emoji: "📘", bg: "linear-gradient(180deg,#4f9bff,#1a5dbe)", path: path.join(PF, "Microsoft Office", "root", "Office16", "WINWORD.EXE") },
    { name: "Excel", emoji: "📗", bg: "linear-gradient(180deg,#4fd07a,#1a7a3e)", path: path.join(PF, "Microsoft Office", "root", "Office16", "EXCEL.EXE") },
    { name: "Spotify", emoji: "🎧", bg: "linear-gradient(180deg,#1ed760,#10843a)", path: path.join(APD, "Spotify", "Spotify.exe") },
  ];
  const seen = new Set();
  return candidates.filter((c) => {
    try {
      if (!fs.existsSync(c.path) || seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    } catch { return false; }
  });
});

ipcMain.handle("native:home", () => HOME);
ipcMain.handle("native:quit", () => app.quit());
ipcMain.handle("native:minimize", () => {
  const w = BrowserWindow.getFocusedWindow();
  if (w) w.minimize();
});

/* single instance — relaunching just focuses the existing window */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
  app.whenReady().then(createWindow);
}
app.on("window-all-closed", () => app.quit());
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
