/* macOS Web — preload bridge.
   Exposes a small, safe native API to the OS UI (contextIsolation stays on). */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("native", {
  homeDir: process.env.USERPROFILE || "",
  userName: process.env.USERNAME || "you",
  readDir: (p) => ipcRenderer.invoke("native:readDir", p),
  openPath: (p) => ipcRenderer.invoke("native:openPath", p),
  reveal: (p) => ipcRenderer.invoke("native:reveal", p),
  launch: (p) => ipcRenderer.invoke("native:launch", p),
  detectApps: () => ipcRenderer.invoke("native:detectApps"),
  quit: () => ipcRenderer.invoke("native:quit"),
  minimizeWindow: () => ipcRenderer.invoke("native:minimize"),
});
