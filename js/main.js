/* ═══════════════════════════════════════════════════════════════
   macOS Web — main.js
   Desktop icons, context menus, keyboard shortcuts, boot init.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ---------- extra glyph for the system drive ---------- */
GLYPHS.hd = `<svg class="full" viewBox="0 0 100 100">
  <rect x="6" y="26" width="88" height="50" rx="10" fill="#dcdce3"/>
  <rect x="6" y="26" width="88" height="25" rx="10" fill="#f4f4f8"/>
  <rect x="6" y="44" width="88" height="8" fill="#e6e6ec"/>
  <circle cx="21" cy="63" r="4.5" fill="#9a9aa4"/>
  <rect x="58" y="59" width="28" height="8" rx="4" fill="#b8b8c2"/>
</svg>`;

const WELCOME_TXT = `Welcome to macOS Web 👋

This entire desktop runs in your browser — no install, no VM.

Things to try
─────────────
• Drag this window around. Resize it from any edge.
• Press Ctrl+Space (or ⌘+Space) for Spotlight.
• Open Terminal and type:  neofetch
• Double-click the dock divider… ok that does nothing, but
  hover the dock — the icons magnify like the real thing.
• Open Music and press play. The audio is synthesised live.
• Apple menu (top-left) → Restart, just for the boot screen.
• System Settings → Wallpaper for five gorgeous gradients.

Everything you write in Notes and everything you trash
is saved in localStorage and survives a reload.

Built with vanilla HTML/CSS/JS. No frameworks were harmed.`;

/* ═══════════════════ DESKTOP ICONS ═══════════════════ */
const DesktopIcons = {
  defs: [
    { name: "Macintosh HD", icon: "hd", fixed: true, open: () => WM.open("finder", { path: ["~"] }) },
    { name: "Projects", icon: "folder", open: () => WM.open("finder", { path: ["~", "Documents", "Old Projects"] }) },
    { name: "Welcome.txt", icon: "textedit", open: () => WM.open("textedit", { name: "Welcome.txt", content: WELCOME_TXT }) },
  ],

  build() {
    const x = Math.max(640, innerWidth - 300);
    this.defs.forEach((def, i) => this.place(def, x, 24 + i * 106));
  },

  place(def, x, y) {
    const root = $("#desktop-icons");
    const node = el(`<div class="desk-icon" style="left:${x}px;top:${y}px">
        <div class="di-img">${def.iconHTML || makeIcon(def.icon)}</div>
        <div class="di-label">${esc(def.name)}</div>
      </div>`);
    root.appendChild(node);

    node.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      $$(".desk-icon", root).forEach((n) => n.classList.remove("selected"));
      node.classList.add("selected");
      const sx = e.clientX, sy = e.clientY;
      const ox = parseFloat(node.style.left), oy = parseFloat(node.style.top);
      const move = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) < 4) return;
        node.style.left = clamp(ox + dx, 0, innerWidth - 92) + "px";
        node.style.top = clamp(oy + dy, 0, innerHeight - 130) + "px";
      };
      const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
    });
    node.addEventListener("dblclick", () => def.open());
    node.addEventListener("contextmenu", (e) => {
      e.preventDefault(); e.stopPropagation();
      $$(".desk-icon").forEach((n) => n.classList.remove("selected"));
      node.classList.add("selected");
      const items = def.realPath
        ? [
            { label: "Open", action: () => def.open() },
            { label: "Show in File Explorer", action: () => window.native.reveal(def.realPath) },
          ]
        : [
            { label: "Open", action: () => def.open() },
            { label: "Get Info", shortcut: "⌘I", action: () => Dialog.show({
                icon: makeIcon(def.icon), title: def.name,
                message: `Kind: ${def.icon === "folder" ? "Folder" : def.icon === "hd" ? "Volume" : "Document"}\nWhere: Desktop\nCreated: today, obviously`,
                buttons: [{ label: "OK", primary: true }],
              }) },
            { sep: true },
            def.fixed
              ? { label: "Move to Trash", disabled: true }
              : { label: "Move to Trash", action: () => { TrashBin.add({ name: def.name, icon: def.icon === "hd" ? "textedit" : def.icon }); node.remove(); } },
          ];
      Menus.context(items, e.clientX, e.clientY);
    });
  },
};

/* ═══════════════════ DESKTOP CONTEXT MENU / CLICKS ═══════════════════ */
function bindDesktop() {
  const root = $("#desktop-icons");
  root.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".desk-icon")) return;
    e.preventDefault();
    Menus.context([
      { label: "New Folder", action: () => DesktopIcons.place(
          { name: "untitled folder", icon: "folder", open: () => WM.open("finder", { path: ["~"] }) },
          clamp(e.clientX - 40, 0, innerWidth - 100), clamp(e.clientY - 30, 30, innerHeight - 140)) },
      { sep: true },
      { label: "Change Wallpaper…", action: () => WM.open("settings", { pane: "wallpaper" }) },
      { label: State.dark ? "Use Light Appearance" : "Use Dark Appearance", action: () => applyTheme(!State.dark) },
      { sep: true },
      { label: "Use Stacks", disabled: true },
      { label: "Show View Options", disabled: true },
    ], e.clientX, e.clientY);
  });
  root.addEventListener("click", (e) => {
    if (e.target === root) {
      $$(".desk-icon").forEach((n) => n.classList.remove("selected"));
      MenuBar.setActiveApp("finder");
    }
  });
}

/* ═══════════════════ KEYBOARD SHORTCUTS ═══════════════════ */
function bindKeys() {
  addEventListener("keydown", (e) => {
    const ae = document.activeElement;
    const typing = ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);

    /* Spotlight: Ctrl+Space or ⌘+Space */
    if ((e.ctrlKey || e.metaKey) && e.code === "Space") {
      e.preventDefault();
      Spotlight.toggle();
      return;
    }
    /* Launchpad: F4 */
    if (e.key === "F4") { e.preventDefault(); Launchpad.toggle(); return; }

    if (e.key === "Escape") {
      if (!$("#spotlight").classList.contains("hidden")) { Spotlight.hide(); return; }
      if (!$("#launchpad").classList.contains("hidden")) { Launchpad.hide(); return; }
      ControlCenter.hide();
      MenuBar.closeMenu();
      $("#ctx-menu").classList.add("hidden");
      return;
    }

    if (typing) return;

    /* window shortcuts (Ctrl as ⌘ stand-in) */
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m") {
      e.preventDefault();
      if (WM.activeWin) WM.minimize(WM.activeId);
      return;
    }
    /* calculator keys */
    if (WM.activeId === "calculator" && WM.activeWin && WM.activeWin.calcKey && !e.ctrlKey && !e.metaKey) {
      WM.activeWin.calcKey(e);
    }
  });
}

/* ═══════════════════ LOCK SCREEN ═══════════════════ */
function bindLock() {
  $("#lock-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") Power.login(); });
  $("#lock").addEventListener("click", () => $("#lock-pass").focus());
}

/* ═══════════════════ MENU BAR STATIC BUTTONS ═══════════════════ */
function bindMenubarExtras() {
  const appleBtn = $(".mb-apple");
  appleBtn.addEventListener("click", () => MenuBar.toggleMenu(appleBtn, MenuBar.appleMenu()));
  appleBtn.addEventListener("mouseenter", () => {
    if (MenuBar.openMenuBtn && MenuBar.openMenuBtn !== appleBtn) MenuBar.toggleMenu(appleBtn, MenuBar.appleMenu());
  });

  $("#mb-clock").addEventListener("click", (e) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const now = new Date();
    Menus.show([
      { label: now.toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" }), disabled: true },
      { sep: true },
      { label: "Open Calendar", action: () => WM.open("calendar") },
      { label: "Open Clock Widget Settings", disabled: true },
    ], r.right - 230, r.bottom + 8);
  });
}

/* ═══════════════════ INIT ═══════════════════ */
(function init() {
  applyTheme(State.dark);
  applyWallpaper(State.wallpaper);
  applyAccent(State.accent);
  applyBrightness(State.brightness);

  Dock.build();
  Dock.refreshTrashIcon();
  MenuBar.setActiveApp("finder");

  Spotlight.init();
  Launchpad.init();
  ControlCenter.init();
  Battery.init();
  Clock.start();

  DesktopIcons.build();
  bindDesktop();
  bindKeys();
  bindLock();
  bindMenubarExtras();

  /* desktop-app mode: detect real Windows apps + show your real Desktop files */
  if (window.native) {
    window.native.detectApps().then((apps) => {
      REAL_APPS = Array.isArray(apps) ? apps : [];
      Dock.injectRealApps();
    });
    window.native.readDir(window.native.homeDir + "\\Desktop").then((list) => {
      if (!Array.isArray(list)) return;
      list.slice(0, 9).forEach((entry, i) => {
        const idx = i + DesktopIcons.defs.length;
        const col = Math.floor(idx / 6), row = idx % 6;
        const full = window.native.homeDir + "\\Desktop\\" + entry.name;
        DesktopIcons.place({
          name: entry.name,
          iconHTML: realIconHTML(full, entry),
          realPath: full,
          open: () => { if (entry.dir) WM.open("finder", { real: full }); else window.native.openPath(full); },
        }, Math.max(40, innerWidth - 300 - col * 112), 24 + row * 106);
      });
    });
  }

  /* #fast in the URL skips the boot + login sequence (also handy for testing).
     #fast&open=finder,terminal additionally opens apps. */
  if (location.hash.includes("fast")) {
    $("#boot").classList.add("hidden");
    $("#lock").classList.add("hidden");
    $("#os").classList.remove("hidden");
    Power.booted = true;
    const m = location.hash.match(/open=([\w,]+)/);
    if (m) setTimeout(() => m[1].split(",").forEach((id) => WM.open(id)), 250);
  } else {
    Power.boot();
  }
})();
