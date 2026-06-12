# 🍎 Replica of macOS

A faithful, fully-interactive **macOS Sequoia desktop** that runs on any laptop —
in a browser tab **or** as a real Windows desktop application (Electron).
Built with **vanilla HTML / CSS / JavaScript — zero frameworks**.

![Desktop](screenshots/desktop.png)

## ✨ Screenshots

| Finder + Terminal | Music, Notes & Calculator |
|---|---|
| ![Finder and Terminal](screenshots/finder-terminal.png) | ![Apps](screenshots/apps.png) |

## 🚀 Run it

| How | Steps |
|---|---|
| **Browser (zero setup)** | Clone, then open `index.html` in Chrome / Edge |
| **Desktop app (dev)** | `npm install` → `npm start` |
| **Desktop app (portable)** | `npm run dist` → `dist\macOS-win32-x64\macOS.exe` |

> **Tips**
> - Add `#fast` to the URL to skip the boot + login animation.
> - The desktop app boots **fullscreen** (Windows taskbar hidden). `Ctrl+Q` quits,
>   `F11` toggles fullscreen,  menu → Quit macOS / Shut Down… also exit.
> - Windows 11 **Smart App Control** may block the self-packaged unsigned exe.
>   If so, launch via `node_modules\electron\dist\electron.exe "<project folder>"`
>   (that's what `npm start` does under the hood).

## 🖥️ What works — the whole OS

### System shell
- **Boot screen** (Apple logo + progress bar) → **lock screen** (any password logs in)
- **Live menu bar** — per-app menus that change with focus, working Apple menu,
  real battery level, Wi-Fi popover, live clock
- **Dock** with true magnification physics (cursor-tracking cosine falloff),
  launch bounce, running-app indicator dots, tooltips, right-click menus
- **Windows**: drag, resize from all 8 edges, traffic-light close / minimise / zoom,
  minimise animates into the dock, double-click titlebar to zoom, full focus management
- **Spotlight** (`Ctrl+Space`) — apps, files and actions
- **Launchpad** (`F4`) with search
- **Control Centre** — Wi-Fi / Bluetooth / AirDrop / Focus toggles, brightness & volume
- Notifications, macOS-style dialogs, desktop right-click menus, draggable desktop icons
- Light / Dark mode, 8 accent colours, 5 wallpapers, dock size & magnification settings —
  all persisted in `localStorage`
- Apple menu → Sleep / Restart / Shut Down with the full boot cycle

### Built-in apps (15)
| App | Highlights |
|---|---|
| **Finder** | Sidebar, back/forward history, search, open files |
| **Safari** | Loads real websites, DuckDuckGo search, favourites grid |
| **Notes** | Real persistent notes — survive reloads |
| **Messages** | Contacts that actually reply (and send notifications) |
| **Mail** | Inbox with read/unread states |
| **Photos** | Generated gradient library + lightbox |
| **Calendar** | Live month view, today highlighted |
| **Music** | **Audio synthesised live with the Web Audio API** — 5 generative tracks |
| **Calculator** | Fully working, keyboard support |
| **Terminal** | `ls cd cat echo neofetch say history` … try `sudo rm -rf /` 😉 |
| **System Settings** | Appearance, accents, wallpapers, dock physics, About |
| **TextEdit / Preview** | Open text files & images from Finder |
| **Trash** | Items collect here; Empty Trash with confirmation |
| **About This Mac** | Chip: *Claude F5 (Fable)* · Memory: *Pure imagination* |

### Real Windows integration (desktop app only)
- **Finder → "This PC"** browses your *actual* files (Home, Desktop, Documents,
  Downloads, Pictures, C:) with real image thumbnails — double-click opens files
  in their real default apps, right-click → *Show in File Explorer*
- Your **real Desktop files appear as icons** on the macOS desktop
- **Detected Windows apps** (VS Code, Chrome, Edge, Notepad, PowerShell…) are pinned
  in the Dock with hand-drawn macOS-style icons, and appear in Launchpad & Spotlight —
  one click launches the real program

## 📁 Project layout

```
index.html          shell markup
style.css           system chrome (menubar, dock, windows, overlays)
apps.css            per-app styles
js/system.js        window manager, dock, menubar, spotlight, power flow
js/apps.js          virtual filesystem + all 15 applications
js/main.js          desktop icons, shortcuts, boot
electron-main.cjs   Electron entry (fullscreen shell + real-files IPC)
preload.cjs         safe context-isolated bridge
```

## 🛠️ Tech notes
- No frameworks, no build step for the web version — three plain JS files
- Electron with `contextIsolation: true` and a minimal IPC surface
- Music is generated with `OscillatorNode` envelopes — no audio files
- Everything persists via `localStorage` (theme, wallpaper, notes, trash…)

---
Made with ❤️ and vanilla JavaScript. Not affiliated with Apple — it just looks that way.
