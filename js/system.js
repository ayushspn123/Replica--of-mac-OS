/* ═══════════════════════════════════════════════════════════════
   macOS Web — system.js
   Core shell: state, theming, window manager, dock, menu bar,
   spotlight, launchpad, control center, notifications, dialogs,
   boot / lock / power flow.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ---------- tiny helpers ---------- */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const Store = {
  get(k, d) {
    try { const v = localStorage.getItem("macweb." + k); return v === null ? d : JSON.parse(v); }
    catch { return d; }
  },
  set(k, v) { try { localStorage.setItem("macweb." + k, JSON.stringify(v)); } catch {} },
};

/* ---------- global state ---------- */
const State = {
  dark: Store.get("dark", true),
  wallpaper: Store.get("wallpaper", "sequoia"),
  accent: Store.get("accent", "#0a84ff"),
  brightness: Store.get("brightness", 1),
  volume: Store.get("volume", 0.6),
  dockSize: Store.get("dockSize", 52),
  magnify: Store.get("magnify", true),
  wifi: true, bluetooth: true, airdrop: false, dnd: false,
  userName: "Ayush Kumar",
  host: "Ayushs-MacBook-Pro",
};

/* ---------- wallpapers ---------- */
const WALLPAPERS = [
  { id: "sequoia",  name: "Sequoia Aurora",
    css: "radial-gradient(90% 70% at 80% 8%, rgba(94,114,235,.6), transparent 62%), radial-gradient(85% 65% at 12% 88%, rgba(255,94,98,.55), transparent 58%), radial-gradient(60% 50% at 58% 78%, rgba(250,177,49,.42), transparent 60%), linear-gradient(160deg, #181a38 0%, #2b2f63 45%, #6b3074 100%)" },
  { id: "sonoma",   name: "Sonoma Sky",
    css: "radial-gradient(100% 80% at 72% 0%, #b3e5ff, transparent 62%), radial-gradient(90% 70% at 8% 100%, #ffd9e9, transparent 58%), linear-gradient(180deg, #7fc4ef, #cfe9fa)" },
  { id: "ventura",  name: "Ventura Dusk",
    css: "radial-gradient(120% 100% at 88% 100%, #ff6a5f, transparent 62%), radial-gradient(100% 80% at 0% 92%, #b03a8c, transparent 58%), linear-gradient(180deg, #2e1437 6%, #903749 70%, #e84a5f)" },
  { id: "monterey", name: "Monterey Flow",
    css: "radial-gradient(80% 60% at 18% 18%, rgba(0,201,167,.7), transparent 62%), radial-gradient(90% 70% at 92% 82%, rgba(132,94,194,.75), transparent 58%), linear-gradient(160deg, #1b2845, #274060)" },
  { id: "graphite", name: "Graphite",
    css: "radial-gradient(100% 80% at 70% 18%, #3c3c46, transparent 62%), radial-gradient(80% 70% at 10% 90%, #23232b, transparent 60%), linear-gradient(180deg, #0e0e12, #26262e)" },
];

function applyWallpaper(id) {
  const wp = WALLPAPERS.find((w) => w.id === id) || WALLPAPERS[0];
  State.wallpaper = wp.id;
  document.documentElement.style.setProperty("--wallpaper-css", wp.css);
  Store.set("wallpaper", wp.id);
}
function applyTheme(dark) {
  State.dark = dark;
  document.body.classList.toggle("dark", dark);
  Store.set("dark", dark);
  $$("#cc-appearance-label").forEach((n) => (n.textContent = dark ? "Dark" : "Light"));
}
function applyAccent(color) {
  State.accent = color;
  document.documentElement.style.setProperty("--accent", color);
  const m = color.match(/^#(..)(..)(..)$/);
  if (m) {
    const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16));
    document.documentElement.style.setProperty("--accent-soft", `rgba(${r},${g},${b},0.18)`);
  }
  Store.set("accent", color);
}
function applyBrightness(v) {
  State.brightness = v;
  $("#brightness-overlay").style.opacity = (1 - v) * 0.75;
  Store.set("brightness", v);
}
function applyDockPrefs() {
  $("#dock").style.setProperty("--size", State.dockSize + "px");
  $("#dock").classList.toggle("no-magnify", !State.magnify);
  Store.set("dockSize", State.dockSize);
  Store.set("magnify", State.magnify);
}

/* ---------- app icons ---------- */
const GLYPHS = {
  finder: `<svg class="full" viewBox="0 0 100 100"><rect width="50" height="100" fill="#e8f6ff" opacity=".92"/><path d="M50 0v100" stroke="#0d76e8" stroke-width="2.5" opacity=".35"/><path d="M30 34v12M70 34v12" stroke="#103f73" stroke-width="6" stroke-linecap="round"/><path d="M22 64c9 10 17 14 28 14s21-4 28-14" fill="none" stroke="#103f73" stroke-width="6" stroke-linecap="round"/></svg>`,
  launchpad: `<svg class="full" viewBox="0 0 100 100">${[0,1,2].map(r=>[0,1,2].map(c=>`<rect x="${20+c*22}" y="${20+r*22}" width="14" height="14" rx="4" fill="${["#ff9f0a","#32d74b","#5ac8fa","#ff375f","#bf5af2","#ffd60a","#64d2ff","#ff6482","#30d158"][r*3+c]}"/>`).join("")).join("")}</svg>`,
  safari: `<svg class="full" viewBox="0 0 100 100"><defs><radialGradient id="saf" cx="50%" cy="32%" r="80%"><stop offset="0%" stop-color="#3fd2ff"/><stop offset="100%" stop-color="#0a6cf5"/></radialGradient></defs><circle cx="50" cy="50" r="38" fill="url(#saf)"/><g stroke="#fff" stroke-width="1.6" opacity=".8">${Array.from({length:24},(_,i)=>{const a=i*15*Math.PI/180,r1=i%2?33:30.5,x1=50+Math.cos(a)*r1,y1=50+Math.sin(a)*r1,x2=50+Math.cos(a)*36,y2=50+Math.sin(a)*36;return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;}).join("")}</g><path d="M68 32 45 45 32 68l23-13z" fill="#fff"/><path d="M68 32 45 45l10 10z" fill="#ff3b30"/></svg>`,
  messages: `<svg viewBox="0 0 100 100"><path d="M50 12C25 12 8 27 8 46c0 11 6 21 16 27-1 6-4 12-9 16 8 0 16-3 22-7 4 1 8 2 13 2 25 0 42-15 42-34S75 12 50 12z" fill="#fff"/></svg>`,
  mail: `<svg viewBox="0 0 100 100"><rect x="10" y="22" width="80" height="56" rx="8" fill="#fff"/><path d="M14 30l36 26 36-26" fill="none" stroke="#1373de" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  photos: `<svg viewBox="0 0 100 100">${[ "#ff3b30","#ff9500","#ffcc00","#28cd41","#00c7be","#007aff","#5856d6","#af52de" ].map((c,i)=>`<ellipse cx="50" cy="29" rx="11" ry="21" fill="${c}" opacity=".82" transform="rotate(${i*45} 50 50)"/>`).join("")}</svg>`,
  notes: `<svg class="full" viewBox="0 0 100 100"><rect width="100" height="30" fill="#fdc02f"/><rect y="28" width="100" height="3" fill="#e8a811"/><g stroke="#c8c8cd" stroke-width="4" stroke-linecap="round"><line x1="16" y1="48" x2="84" y2="48"/><line x1="16" y1="63" x2="84" y2="63"/><line x1="16" y1="78" x2="62" y2="78"/></g>${[22,38,54,70,86].map(x=>`<circle cx="${x}" cy="14" r="3.4" fill="#b78708"/>`).join("")}</svg>`,
  music: `<svg viewBox="0 0 100 100"><path d="M38 78V30l38-10v44" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="29" cy="78" rx="11" ry="9" fill="#fff"/><ellipse cx="67" cy="64" rx="11" ry="9" fill="#fff"/></svg>`,
  calculator: `<svg class="full" viewBox="0 0 100 100"><rect x="22" y="14" width="56" height="20" rx="5" fill="#cfe3cf" opacity=".9"/>${[0,1,2].map(r=>[0,1,2,3].map(c=>`<rect x="${22+c*15}" y="${42+r*16}" width="11" height="11" rx="5.5" fill="${c===3?"#ff9f0a":"#9a9aa2"}"/>`).join("")).join("")}</svg>`,
  terminal: `<svg class="full" viewBox="0 0 100 100"><path d="M22 32l18 16-18 16" fill="none" stroke="#32d74b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><line x1="48" y1="66" x2="76" y2="66" stroke="#f5f5f7" stroke-width="8" stroke-linecap="round"/></svg>`,
  settings: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="none" stroke="#f2f2f5" stroke-width="15" stroke-dasharray="7.8 7.9"/><circle cx="50" cy="50" r="21" fill="#f2f2f5"/><circle cx="50" cy="50" r="9" fill="#6e6e76"/></svg>`,
  trash: `<svg viewBox="0 0 100 100"><path d="M28 30h44l-5 52H33z" fill="none" stroke="#7d7d85" stroke-width="3.5"/><path d="M24 30h52" stroke="#7d7d85" stroke-width="3.5" stroke-linecap="round"/><path d="M42 30v-6h16v6" fill="none" stroke="#7d7d85" stroke-width="3.5"/>${[38,46,54,62].map(x=>`<line x1="${x}" y1="38" x2="${x+1}" y2="74" stroke="#7d7d85" stroke-width="2.5"/>`).join("")}</svg>`,
  trashFull: `<svg viewBox="0 0 100 100"><circle cx="42" cy="24" r="8" fill="#d9d9de" stroke="#9a9aa2" stroke-width="2"/><circle cx="57" cy="20" r="6" fill="#e6e6ea" stroke="#9a9aa2" stroke-width="2"/><path d="M28 30h44l-5 52H33z" fill="none" stroke="#7d7d85" stroke-width="3.5"/><path d="M24 30h52" stroke="#7d7d85" stroke-width="3.5" stroke-linecap="round"/>${[38,46,54,62].map(x=>`<line x1="${x}" y1="38" x2="${x+1}" y2="74" stroke="#7d7d85" stroke-width="2.5"/>`).join("")}</svg>`,
  textedit: `<svg class="full" viewBox="0 0 100 100"><g stroke="#c2c2c8" stroke-width="3.5" stroke-linecap="round"><line x1="16" y1="30" x2="84" y2="30"/><line x1="16" y1="44" x2="84" y2="44"/><line x1="16" y1="58" x2="84" y2="58"/><line x1="16" y1="72" x2="60" y2="72"/></g><path d="M70 78l14-26 7 4-14 26-9 3z" fill="#8e8e96"/></svg>`,
  preview: `<svg viewBox="0 0 100 100"><rect x="14" y="20" width="72" height="56" rx="7" fill="#fff"/><circle cx="34" cy="38" r="7" fill="#ffcc00"/><path d="M20 68l20-22 14 14 12-12 14 16v6a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6z" fill="#28cd41"/></svg>`,
  folder: `<svg class="full" viewBox="0 0 100 100"><path d="M9 30c0-4.4 3.6-8 8-8h21l9 9h36c4.4 0 8 3.6 8 8v4H9z" fill="#2fa1f0"/><rect x="9" y="38" width="82" height="42" rx="7" fill="#5fbef7"/><rect x="9" y="38" width="82" height="6" fill="#fff" opacity=".25"/></svg>`,
};

/* real Windows apps detected via Electron (populated in main.js) */
let REAL_APPS = [];

/* hand-drawn macOS-style icons for well-known Windows apps */
const REAL_APP_GLYPHS = {
  "vs code": { bg: "linear-gradient(180deg,#33a7f2,#0f6cbd)",
    svg: `<svg viewBox="0 0 100 100"><path d="M72 12 35 47 21 36l-9 5 17 14-17 14 9 5 14-11 37 35 14-7V19z" fill="#fff" opacity=".96"/><path d="M72 12v76L46 64l26-28z" fill="#fff" opacity=".55"/></svg>` },
  "chrome": { bg: "linear-gradient(180deg,#ffffff,#e9ebee)",
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#fff"/><path d="M50 50 22.5 32A34 34 0 0 1 84 50z" fill="#ea4335"/><path d="M50 50 22.5 32a34 34 0 0 0 8 47.5z" fill="#fbbc05"/><path d="M50 50l-19.5 29.5A34 34 0 0 0 84 50z" fill="#34a853"/><circle cx="50" cy="50" r="15.5" fill="#fff"/><circle cx="50" cy="50" r="11.5" fill="#4285f4"/></svg>` },
  "edge": { bg: "linear-gradient(160deg,#35d2cd,#0c5a96)",
    svg: `<svg viewBox="0 0 100 100"><path d="M20 58c0-21 14-36 32-36 17 0 28 12 28 27v6H38c1 9 9 15 20 15 7 0 13-2 18-5v12c-6 4-13 6-21 6-20 0-35-11-35-25z" fill="#fff" opacity=".95"/></svg>` },
  "notepad": { bg: "linear-gradient(180deg,#ffffff,#eef0f4)",
    svg: `<svg class="full" viewBox="0 0 100 100"><rect width="100" height="18" fill="#3f8cca"/><g stroke="#b9bdc7" stroke-width="4.5" stroke-linecap="round"><line x1="18" y1="40" x2="82" y2="40"/><line x1="18" y1="56" x2="82" y2="56"/><line x1="18" y1="72" x2="60" y2="72"/></g></svg>` },
  "paint": { bg: "linear-gradient(180deg,#ffffff,#f3e9f0)",
    svg: `<svg viewBox="0 0 100 100"><path d="M50 16c-19 0-34 13-34 30 0 16 13 29 30 29 5 0 8-3 8-7 0-2-1-4-2-5-1-2-2-3-2-5 0-4 3-7 8-7h9c10 0 17-7 17-16 0-11-15-19-34-19z" fill="#9aa2ad"/><circle cx="36" cy="36" r="5.5" fill="#ea4335"/><circle cx="56" cy="30" r="5.5" fill="#fbbc05"/><circle cx="70" cy="42" r="5.5" fill="#34a853"/><circle cx="32" cy="52" r="5.5" fill="#4285f4"/></svg>` },
  "file explorer": { bg: "transparent",
    svg: GLYPHS.folder, noShadow: true },
  "powershell": { bg: "linear-gradient(160deg,#3f6fb4,#16315e)",
    svg: `<svg viewBox="0 0 100 100"><path d="M26 30l22 20-22 20" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><line x1="50" y1="70" x2="76" y2="70" stroke="#fff" stroke-width="9" stroke-linecap="round"/></svg>` },
  "word": { bg: "linear-gradient(180deg,#4f9bff,#1a5dbe)",
    svg: `<svg viewBox="0 0 100 100"><text x="50" y="70" text-anchor="middle" font-size="56" font-weight="800" font-family="Segoe UI,Arial" fill="#fff">W</text></svg>` },
  "excel": { bg: "linear-gradient(180deg,#4fd07a,#16703a)",
    svg: `<svg viewBox="0 0 100 100"><text x="50" y="70" text-anchor="middle" font-size="56" font-weight="800" font-family="Segoe UI,Arial" fill="#fff">X</text></svg>` },
  "spotify": { bg: "linear-gradient(180deg,#23d465,#13863e)",
    svg: `<svg viewBox="0 0 100 100"><path d="M30 40c14-4.5 30-3.5 42 4M32 53c11.5-3.5 24-2.5 34 4M34 65c9-2.5 18-1.5 26 3.5" stroke="#0e0e10" stroke-width="7" stroke-linecap="round" fill="none"/></svg>` },
};

function realAppIcon(a) {
  const def = REAL_APP_GLYPHS[a.name.toLowerCase()];
  if (def) return `<div class="app-icon" style="background:${def.bg}${def.noShadow ? ";box-shadow:none" : ""}">${def.svg}</div>`;
  return `<div class="app-icon" style="background:${a.bg}"><span class="real-ic">${esc(a.name[0])}</span></div>`;
}

function makeIcon(key, cls) {
  if (key === "calendar") {
    const now = new Date();
    const mon = now.toLocaleString("en", { month: "short" }).toUpperCase();
    return `<div class="app-icon ic-calendar ${cls || ""}"><span class="cal-month">${mon}</span><span class="cal-day">${now.getDate()}</span></div>`;
  }
  return `<div class="app-icon ic-${key} ${cls || ""}">${GLYPHS[key] || ""}</div>`;
}

/* ═══════════════════ WINDOW MANAGER ═══════════════════ */
const WM = {
  wins: new Map(),
  zTop: 200,
  openCount: 0,
  activeId: null,

  get activeWin() { return this.wins.get(this.activeId) || null; },

  open(appId, payload) {
    const app = APPS[appId];
    if (!app) return;
    if (appId === "launchpad") { Launchpad.toggle(); return; }

    const existing = this.wins.get(appId);
    if (existing) {
      if (existing.minimized) this.restore(appId);
      this.focus(appId);
      if (payload !== undefined && app.render) {
        existing.body.innerHTML = "";
        app.render(existing.body, existing, payload);
      }
      return;
    }

    const w = app.width || 760, h = app.height || 500;
    const work = this.workArea();
    const off = (this.openCount % 7) * 28;
    const x = clamp(Math.round((work.w - w) / 2) + off - 60, 8, Math.max(8, work.w - w - 8));
    const y = clamp(work.top + 52 + off, work.top + 6, Math.max(work.top + 6, work.h - h - 20));
    this.openCount++;

    const winEl = el(`
      <div class="window ${app.seamless ? "seamless" : ""} ${app.sidebar === false ? "no-sidebar" : ""}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${++this.zTop}">
        <div class="titlebar">
          <div class="traffic">
            <button class="tl-btn tl-close" title="Close"><svg viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="rgba(77,0,0,.65)" stroke-width="1.3" stroke-linecap="round"/></svg></button>
            <button class="tl-btn tl-min" title="Minimise"><svg viewBox="0 0 10 10"><path d="M2 5h6" stroke="rgba(90,55,0,.7)" stroke-width="1.4" stroke-linecap="round"/></svg></button>
            <button class="tl-btn tl-max" title="Zoom"><svg viewBox="0 0 10 10"><path d="M2.6 6.5v1h1zM7.4 3.5v-1h-1z" stroke="rgba(0,70,0,.7)" stroke-width="1.1"/><path d="M2.6 7.4L7.4 2.6" stroke="rgba(0,70,0,.7)" stroke-width="1.1"/></svg></button>
          </div>
          <div class="title">${esc(app.name)}</div>
        </div>
        <div class="win-body"></div>
        ${["n","s","e","w","ne","nw","se","sw"].map((d) => `<div class="rs rs-${d}" data-dir="${d}"></div>`).join("")}
      </div>`);

    const win = {
      id: appId, app, el: winEl,
      body: $(".win-body", winEl),
      minimized: false, maximized: false, prevRect: null,
      addDragHandle: (h2) => this._makeDraggable(win, h2),
      setTitle: (t) => ($(".title", winEl).textContent = t),
    };
    this.wins.set(appId, win);
    $("#windows").appendChild(winEl);

    /* traffic lights */
    $(".tl-close", winEl).addEventListener("click", (e) => { e.stopPropagation(); this.close(appId); });
    $(".tl-min", winEl).addEventListener("click", (e) => { e.stopPropagation(); this.minimize(appId); });
    $(".tl-max", winEl).addEventListener("click", (e) => { e.stopPropagation(); this.toggleMax(appId); });

    /* focus + drag + resize */
    winEl.addEventListener("pointerdown", () => this.focus(appId), true);
    this._makeDraggable(win, $(".titlebar", winEl));
    $$(".rs", winEl).forEach((hd) => this._makeResizable(win, hd));

    if (app.render) app.render(win.body, win, payload);

    requestAnimationFrame(() => requestAnimationFrame(() => winEl.classList.add("shown")));
    this.focus(appId);
    Dock.setRunning(appId, true);
    Dock.bounce(appId);
  },

  workArea() {
    const top = 30;
    return { top, w: innerWidth, h: innerHeight };
  },

  focus(appId) {
    const win = this.wins.get(appId);
    if (!win) return;
    if (this.activeId !== appId) {
      this.wins.forEach((w) => w.el.classList.remove("focused"));
      win.el.classList.add("focused");
      win.el.style.zIndex = ++this.zTop;
      this.activeId = appId;
      MenuBar.setActiveApp(appId);
    }
  },

  close(appId) {
    const win = this.wins.get(appId);
    if (!win) return;
    if (win.app.onClose) win.app.onClose(win);
    win.el.classList.add("closing");
    setTimeout(() => win.el.remove(), 170);
    this.wins.delete(appId);
    Dock.setRunning(appId, false);
    if (this.activeId === appId) {
      this.activeId = null;
      let topWin = null;
      this.wins.forEach((w) => {
        if (!w.minimized && (!topWin || +w.el.style.zIndex > +topWin.el.style.zIndex)) topWin = w;
      });
      if (topWin) this.focus(topWin.id);
      else MenuBar.setActiveApp("finder");
    }
  },

  closeActive() { if (this.activeWin) this.close(this.activeId); },
  closeAll() { [...this.wins.keys()].forEach((id) => this.close(id)); },

  minimize(appId) {
    const win = this.wins.get(appId);
    if (!win || win.minimized) return;
    const r = win.el.getBoundingClientRect();
    const dockIc = $(`#dock .dock-item[data-app="${appId}"]`) || $("#dock");
    const dr = dockIc.getBoundingClientRect();
    const dx = dr.left + dr.width / 2 - (r.left + r.width / 2);
    const dy = dr.top + dr.height / 2 - (r.top + r.height / 2);
    const s = Math.max(0.04, dr.width / r.width);
    win.el.classList.add("minimizing");
    win.el.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
    win.el.style.opacity = "0";
    setTimeout(() => {
      win.el.style.display = "none";
      win.el.classList.remove("minimizing");
      win.minimized = true;
    }, 390);
    if (this.activeId === appId) {
      this.activeId = null;
      MenuBar.setActiveApp("finder");
    }
  },

  restore(appId) {
    const win = this.wins.get(appId);
    if (!win || !win.minimized) return;
    win.minimized = false;
    win.el.style.display = "";
    requestAnimationFrame(() => {
      win.el.classList.add("restoring");
      win.el.style.transform = "";
      win.el.style.opacity = "";
      setTimeout(() => win.el.classList.remove("restoring"), 340);
    });
    this.focus(appId);
  },

  toggleMax(appId) {
    const win = this.wins.get(appId);
    if (!win) return;
    const st = win.el.style;
    if (!win.maximized) {
      win.prevRect = { l: st.left, t: st.top, w: st.width, h: st.height };
      const wa = this.workArea();
      Object.assign(st, { left: "0px", top: wa.top + "px", width: wa.w + "px", height: wa.h - wa.top + "px" });
      win.el.classList.add("maximized");
      win.maximized = true;
    } else {
      const p = win.prevRect || { l: "80px", t: "70px", w: "760px", h: "500px" };
      Object.assign(st, { left: p.l, top: p.t, width: p.w, height: p.h });
      win.el.classList.remove("maximized");
      win.maximized = false;
    }
  },

  _makeDraggable(win, handle) {
    if (!handle) return;
    handle.addEventListener("dblclick", (e) => {
      if (e.target.closest("button, input, textarea, select, [contenteditable], a, .no-drag")) return;
      this.toggleMax(win.id);
    });
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("button, input, textarea, select, [contenteditable], a, .no-drag")) return;
      const st = win.el.style;
      const startX = e.clientX, startY = e.clientY;
      const origL = parseFloat(st.left), origT = parseFloat(st.top);
      let moved = false;
      const move = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
        if (!moved) { moved = true; win.el.classList.add("dragging"); win.maximized = false; win.el.classList.remove("maximized"); }
        const w = win.el.offsetWidth;
        st.left = clamp(origL + dx, -w + 120, innerWidth - 120) + "px";
        st.top = clamp(origT + dy, 30, innerHeight - 50) + "px";
      };
      const up = () => {
        win.el.classList.remove("dragging");
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
    });
  },

  _makeResizable(win, handle) {
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      this.focus(win.id);
      const dir = handle.dataset.dir;
      const st = win.el.style;
      const startX = e.clientX, startY = e.clientY;
      const r = { l: parseFloat(st.left), t: parseFloat(st.top), w: win.el.offsetWidth, h: win.el.offsetHeight };
      const minW = win.app.minW || 320, minH = win.app.minH || 220;
      win.el.classList.add("resizing");
      const move = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        let { l, t, w, h } = r;
        if (dir.includes("e")) w = Math.max(minW, r.w + dx);
        if (dir.includes("s")) h = Math.max(minH, r.h + dy);
        if (dir.includes("w")) { w = Math.max(minW, r.w - dx); l = r.l + (r.w - w); }
        if (dir.includes("n")) { h = Math.max(minH, r.h - dy); t = r.t + (r.h - h); }
        if (t < 30) { h -= 30 - t; t = 30; }
        Object.assign(st, { left: l + "px", top: t + "px", width: w + "px", height: h + "px" });
        win.maximized = false; win.el.classList.remove("maximized");
      };
      const up = () => {
        win.el.classList.remove("resizing");
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
    });
  },
};

/* ═══════════════════ DOCK ═══════════════════ */
const Dock = {
  ORDER: ["finder", "launchpad", "safari", "messages", "mail", "photos", "notes", "calendar", "music", "calculator", "terminal", "settings", "|", "trash"],

  build() {
    const dock = $("#dock");
    dock.innerHTML = "";
    this.ORDER.forEach((id) => {
      if (id === "|") { dock.appendChild(el(`<div class="dock-sep"></div>`)); return; }
      const app = APPS[id];
      if (!app) return;
      const item = el(`<button class="dock-item" data-app="${id}" data-label="${esc(app.name)}">${makeIcon(app.icon)}<span class="run-dot"></span></button>`);
      item.addEventListener("click", () => {
        const win = WM.wins.get(id);
        if (win && win.minimized) WM.restore(id);
        else WM.open(id);
      });
      item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const running = !!WM.wins.get(id);
        Menus.context([
          { label: app.name, disabled: true },
          { sep: true },
          { label: "Open", action: () => WM.open(id) },
          ...(running ? [
            { label: "Hide", action: () => WM.minimize(id) },
            { label: "Quit", action: () => WM.close(id) },
          ] : []),
        ], e.clientX, e.clientY - 10);
      });
      dock.appendChild(item);
    });
    applyDockPrefs();

    /* magnification: 1:1 cursor tracking (no transition while inside),
       cosine falloff like the real dock, smooth ease-back on leave */
    dock.addEventListener("mousemove", (e) => {
      if (!State.magnify) return;
      dock.classList.add("magnify-live");
      $$(".dock-item", dock).forEach((it) => {
        const r = it.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        const range = State.dockSize * 3;
        let mag = 1;
        if (d < range) mag = 1 + 0.6 * Math.cos(((d / range) * Math.PI) / 2) ** 2;
        it.style.setProperty("--mag", mag.toFixed(3));
      });
    });
    dock.addEventListener("mouseleave", () => {
      dock.classList.remove("magnify-live");
      $$(".dock-item", dock).forEach((it) => it.style.setProperty("--mag", 1));
    });
  },

  /* real Windows apps (VS Code, Chrome…) pinned between system apps and Trash */
  injectRealApps() {
    if (!REAL_APPS.length || !window.native) return;
    const dock = $("#dock");
    const firstSep = $(".dock-sep", dock);
    if (!firstSep || $(".dock-item[data-real-app]", dock)) return;
    const frag = document.createDocumentFragment();
    frag.appendChild(el(`<div class="dock-sep"></div>`));
    REAL_APPS.slice(0, 6).forEach((a) => {
      const item = el(`<button class="dock-item" data-real-app="1" data-label="${esc(a.name)}">${realAppIcon(a)}<span class="run-dot"></span></button>`);
      item.addEventListener("click", () => {
        window.native.launch(a.path);
        item.classList.add("bouncing");
        setTimeout(() => item.classList.remove("bouncing"), 1300);
      });
      item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        Menus.context([
          { label: a.name + " (Windows)", disabled: true },
          { sep: true },
          { label: "Open", action: () => window.native.launch(a.path) },
          { label: "Show in File Explorer", action: () => window.native.reveal(a.path) },
        ], e.clientX, e.clientY - 10);
      });
      frag.appendChild(item);
    });
    dock.insertBefore(frag, firstSep);
  },

  setRunning(appId, on) {
    const it = $(`#dock .dock-item[data-app="${appId}"]`);
    if (it) it.classList.toggle("running", on);
  },
  bounce(appId) {
    const it = $(`#dock .dock-item[data-app="${appId}"]`);
    if (!it) return;
    it.classList.add("bouncing");
    setTimeout(() => it.classList.remove("bouncing"), 1300);
  },
  refreshTrashIcon() {
    const it = $(`#dock .dock-item[data-app="trash"] .app-icon`);
    if (it) it.innerHTML = TrashBin.items.length ? GLYPHS.trashFull : GLYPHS.trash;
  },
};

/* ═══════════════════ MENU BAR ═══════════════════ */
const MenuBar = {
  activeApp: "finder",
  openMenuBtn: null,

  appleMenu() {
    return [
      { label: "About This Mac", action: () => WM.open("about") },
      { sep: true },
      { label: "System Settings…", action: () => WM.open("settings") },
      { label: "App Store…", disabled: true },
      { sep: true },
      { label: "Sleep", action: () => Power.sleep() },
      { label: "Restart…", action: () => Power.confirmRestart() },
      { label: "Shut Down…", action: () => Power.confirmShutdown() },
      { sep: true },
      { label: "Lock Screen", shortcut: "⌃⌘Q", action: () => Power.lock() },
      { label: `Log Out ${State.userName}…`, shortcut: "⇧⌘Q", action: () => { WM.closeAll(); Power.lock(); } },
      ...(window.native ? [
        { sep: true },
        { label: "Quit macOS", shortcut: "⌃Q", action: () => window.native.quit() },
      ] : []),
    ];
  },

  defaultMenus(app) {
    const patch = app.menuPatch || {};
    const file = [
      ...(patch.File || []),
      { label: "Close Window", shortcut: "⌘W", action: () => WM.closeActive() },
    ];
    return [
      { title: "File", items: file },
      { title: "Edit", items: [
        { label: "Undo", shortcut: "⌘Z", action: () => document.execCommand("undo") },
        { label: "Redo", shortcut: "⇧⌘Z", action: () => document.execCommand("redo") },
        { sep: true },
        { label: "Cut", shortcut: "⌘X", action: () => document.execCommand("cut") },
        { label: "Copy", shortcut: "⌘C", action: () => document.execCommand("copy") },
        { label: "Paste", shortcut: "⌘V", disabled: true },
        { label: "Select All", shortcut: "⌘A", action: () => document.execCommand("selectAll") },
      ]},
      { title: "View", items: [
        ...(patch.View || []),
        { label: State.dark ? "Switch to Light Mode" : "Switch to Dark Mode", action: () => applyTheme(!State.dark) },
        { label: "Change Wallpaper…", action: () => WM.open("settings", { pane: "wallpaper" }) },
      ]},
      { title: "Window", items: [
        { label: "Minimise", shortcut: "⌘M", action: () => WM.activeWin && WM.minimize(WM.activeId) },
        { label: "Zoom", action: () => WM.activeWin && WM.toggleMax(WM.activeId) },
        { sep: true },
        { label: "Bring All to Front", disabled: true },
      ]},
      { title: "Help", items: [
        { label: `About ${app.name}`, action: () => Dialog.show({
            icon: makeIcon(app.icon), title: app.name,
            message: `${app.about || "Part of macOS Web Edition."}\nVersion 1.0`,
            buttons: [{ label: "OK", primary: true }],
          }) },
      ]},
    ];
  },

  setActiveApp(appId) {
    const app = APPS[appId] || APPS.finder;
    this.activeApp = app.id;
    const wrap = $("#mb-menus");
    wrap.innerHTML = "";
    const menus = [{ title: app.name, bold: true, items: null }];
    const defs = app.menus ? app.menus() : this.defaultMenus(app);
    defs.forEach((m) => menus.push(m));
    menus.forEach((m, i) => {
      const items = m.items || [
        { label: `About ${app.name}`, action: () => Dialog.show({ icon: makeIcon(app.icon), title: app.name, message: (app.about || "") + "\nVersion 1.0", buttons: [{ label: "OK", primary: true }] }) },
        { sep: true },
        { label: `Quit ${app.name}`, shortcut: "⌘Q", action: () => WM.close(app.id) },
      ];
      const btn = el(`<button class="mb-item ${m.bold ? "mb-appname" : ""}">${esc(m.title)}</button>`);
      btn.addEventListener("click", () => this.toggleMenu(btn, items));
      btn.addEventListener("mouseenter", () => { if (this.openMenuBtn && this.openMenuBtn !== btn) this.toggleMenu(btn, items); });
      wrap.appendChild(btn);
    });
  },

  toggleMenu(btn, items) {
    if (this.openMenuBtn === btn) { this.closeMenu(); return; }
    this.closeMenu();
    this.openMenuBtn = btn;
    btn.classList.add("open");
    const r = btn.getBoundingClientRect();
    Menus.show(items, r.left, r.bottom + 6, () => this.closeMenu(false));
  },

  closeMenu(hide = true) {
    if (this.openMenuBtn) { this.openMenuBtn.classList.remove("open"); this.openMenuBtn = null; }
    if (hide) Menus.hide();
  },
};

/* shared dropdown/context-menu renderer */
const Menus = {
  onHide: null,
  show(items, x, y, onHide, elId = "#menu-dropdown") {
    const root = $(elId);
    this.onHide = onHide || null;
    root.innerHTML = "";
    items.forEach((it) => {
      if (it.sep) { root.appendChild(el(`<div class="menu-sep"></div>`)); return; }
      const row = el(`<div class="menu-item ${it.disabled ? "disabled" : ""}">
          <span>${it.checked ? "✓ " : ""}${esc(it.label)}</span>
          ${it.shortcut ? `<span class="shortcut">${esc(it.shortcut)}</span>` : ""}
        </div>`);
      if (!it.disabled && it.action) {
        row.addEventListener("click", () => { this.hide(); MenuBar.closeMenu(false); it.action(); });
      }
      root.appendChild(row);
    });
    root.classList.remove("hidden");
    const rw = root.offsetWidth, rh = root.offsetHeight;
    root.style.left = clamp(x, 6, innerWidth - rw - 6) + "px";
    root.style.top = clamp(y, 30, innerHeight - rh - 6) + "px";
  },
  hide() {
    $("#menu-dropdown").classList.add("hidden");
    $("#ctx-menu").classList.add("hidden");
    if (this.onHide) { const f = this.onHide; this.onHide = null; f(); }
  },
  context(items, x, y) { this.show(items, x, y, null, "#ctx-menu"); },
};

/* ═══════════════════ SPOTLIGHT ═══════════════════ */
const Spotlight = {
  idx: 0, results: [],

  toggle() {
    const sp = $("#spotlight");
    if (sp.classList.contains("hidden")) {
      sp.classList.remove("hidden");
      const inp = $("#spotlight-input");
      inp.value = ""; this.render("");
      setTimeout(() => inp.focus(), 30);
    } else this.hide();
  },
  hide() { $("#spotlight").classList.add("hidden"); },

  search(q) {
    q = q.trim().toLowerCase();
    const out = [];
    Object.values(APPS).forEach((a) => {
      if (a.spotlight === false) return;
      if (!q || a.name.toLowerCase().includes(q)) out.push({ name: a.name, kind: "Application", icon: a.icon, run: () => WM.open(a.id) });
    });
    REAL_APPS.forEach((a) => {
      if (!q || a.name.toLowerCase().includes(q))
        out.push({ name: a.name, kind: "Windows App", iconHTML: realAppIcon(a), run: () => window.native.launch(a.path) });
    });
    if (q) {
      walkFS(FS_HOME, ["~"], (node, path, name) => {
        if (name.toLowerCase().includes(q) && out.length < 14)
          out.push({
            name, kind: node.type === "dir" ? "Folder" : "Document", icon: node.type === "dir" ? "folder" : "textedit",
            run: () => node.type === "dir" ? WM.open("finder", { path }) : openFile(name, node, path.slice(0, -1)),
          });
      });
      const actions = [
        { name: "Toggle Dark Mode", kind: "Action", icon: "settings", run: () => applyTheme(!State.dark) },
        { name: "Sleep", kind: "Action", icon: "settings", run: () => Power.sleep() },
        { name: "Empty Trash", kind: "Action", icon: "trash", run: () => TrashBin.confirmEmpty() },
      ].filter((a) => a.name.toLowerCase().includes(q));
      out.push(...actions);
    }
    return out.slice(0, 12);
  },

  render(q) {
    this.results = this.search(q);
    this.idx = 0;
    const box = $("#spotlight-results");
    box.innerHTML = this.results.map((r, i) => `
      <div class="sp-row ${i === 0 ? "active" : ""}" data-i="${i}">
        ${r.iconHTML || makeIcon(r.icon)}<span class="sp-name">${esc(r.name)}</span><span class="sp-kind">${r.kind}</span>
      </div>`).join("");
    $$(".sp-row", box).forEach((row) => {
      row.addEventListener("click", () => this.launch(+row.dataset.i));
      row.addEventListener("mousemove", () => this.setIdx(+row.dataset.i));
    });
  },

  setIdx(i) {
    this.idx = clamp(i, 0, this.results.length - 1);
    $$("#spotlight-results .sp-row").forEach((r, j) => r.classList.toggle("active", j === this.idx));
    const act = $(`#spotlight-results .sp-row[data-i="${this.idx}"]`);
    if (act) act.scrollIntoView({ block: "nearest" });
  },

  launch(i) {
    const r = this.results[i];
    if (!r) return;
    this.hide();
    r.run();
  },

  init() {
    $("#spotlight-input").addEventListener("input", (e) => this.render(e.target.value));
    $("#spotlight-input").addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); this.setIdx(this.idx + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); this.setIdx(this.idx - 1); }
      else if (e.key === "Enter") this.launch(this.idx);
      else if (e.key === "Escape") this.hide();
    });
    $("#spotlight").addEventListener("click", (e) => { if (e.target.id === "spotlight") this.hide(); });
    $("#mb-spotlight").addEventListener("click", () => this.toggle());
  },
};

/* ═══════════════════ LAUNCHPAD ═══════════════════ */
const Launchpad = {
  toggle() {
    const lp = $("#launchpad");
    if (lp.classList.contains("hidden")) {
      lp.classList.remove("hidden");
      this.render("");
      const s = $("#lp-search");
      s.value = "";
      setTimeout(() => s.focus(), 30);
    } else this.hide();
  },
  hide() { $("#launchpad").classList.add("hidden"); },
  render(q) {
    q = q.toLowerCase();
    const grid = $("#lp-grid");
    grid.innerHTML = "";
    Object.values(APPS).forEach((a) => {
      if (a.launchpad === false) return;
      if (q && !a.name.toLowerCase().includes(q)) return;
      const item = el(`<div class="lp-app">${makeIcon(a.icon)}<span class="lp-label">${esc(a.name)}</span></div>`);
      item.addEventListener("click", () => { this.hide(); WM.open(a.id); });
      grid.appendChild(item);
    });
    REAL_APPS.forEach((a) => {
      if (q && !a.name.toLowerCase().includes(q)) return;
      const item = el(`<div class="lp-app">${realAppIcon(a)}<span class="lp-label">${esc(a.name)}</span></div>`);
      item.addEventListener("click", () => { this.hide(); window.native.launch(a.path); });
      grid.appendChild(item);
    });
  },
  init() {
    $("#lp-search").addEventListener("input", (e) => this.render(e.target.value));
    $("#launchpad").addEventListener("click", (e) => { if (e.target.id === "launchpad" || e.target.id === "lp-grid") this.hide(); });
  },
};

/* ═══════════════════ CONTROL CENTER ═══════════════════ */
const ControlCenter = {
  built: false,
  toggle() {
    const cc = $("#control-center");
    if (cc.classList.contains("hidden")) { this.build(); cc.classList.remove("hidden"); }
    else cc.classList.add("hidden");
  },
  hide() { $("#control-center").classList.add("hidden"); },

  build() {
    const cc = $("#control-center");
    cc.innerHTML = `
      <div class="cc-tile cc-wide" id="cc-conn">
        ${[
          { k: "wifi", l: "Wi-Fi", s: () => State.wifi ? "Home_5G" : "Off", ic: "📶" },
          { k: "bluetooth", l: "Bluetooth", s: () => State.bluetooth ? "On" : "Off", ic: "🅱" },
          { k: "airdrop", l: "AirDrop", s: () => State.airdrop ? "Everyone" : "Off", ic: "📡" },
        ].map((t) => `
          <div class="cc-row">
            <div class="cc-toggle-ic ${State[t.k] ? "on" : ""}" data-k="${t.k}">${t.ic}</div>
            <div><div class="cc-lbl">${t.l}</div><div class="cc-sub" data-sub="${t.k}">${t.s()}</div></div>
          </div>`).join("")}
      </div>
      <div class="cc-tile">
        <div class="cc-row" style="padding:0">
          <div class="cc-toggle-ic ${State.dnd ? "on" : ""}" data-k="dnd">🌙</div>
          <div><div class="cc-lbl">Focus</div><div class="cc-sub" data-sub="dnd">${State.dnd ? "Do Not Disturb" : "Off"}</div></div>
        </div>
      </div>
      <div class="cc-tile cc-appearance" id="cc-appearance">
        <span style="font-size:17px">${State.dark ? "🌑" : "☀️"}</span>
        <span id="cc-appearance-label">${State.dark ? "Dark" : "Light"}</span>
      </div>
      <div class="cc-tile cc-wide">
        <div class="cc-title">Display</div>
        <input type="range" class="cc-slider" id="cc-bright" min="0.25" max="1" step="0.01" value="${State.brightness}">
      </div>
      <div class="cc-tile cc-wide">
        <div class="cc-title">Sound</div>
        <input type="range" class="cc-slider" id="cc-vol" min="0" max="1" step="0.01" value="${State.volume}">
      </div>`;

    $$(".cc-toggle-ic", cc).forEach((t) => {
      t.addEventListener("click", () => {
        const k = t.dataset.k;
        State[k] = !State[k];
        t.classList.toggle("on", State[k]);
        const sub = $(`[data-sub="${k}"]`, cc);
        if (sub) sub.textContent =
          k === "wifi" ? (State.wifi ? "Home_5G" : "Off") :
          k === "bluetooth" ? (State.bluetooth ? "On" : "Off") :
          k === "airdrop" ? (State.airdrop ? "Everyone" : "Off") :
          State.dnd ? "Do Not Disturb" : "Off";
      });
    });
    $("#cc-appearance", cc).addEventListener("click", () => { applyTheme(!State.dark); this.build(); });
    $("#cc-bright", cc).addEventListener("input", (e) => applyBrightness(+e.target.value));
    $("#cc-vol", cc).addEventListener("input", (e) => { State.volume = +e.target.value; Store.set("volume", State.volume); if (typeof MusicPlayer !== "undefined") MusicPlayer.setVolume(State.volume); });
  },

  init() { $("#mb-cc").addEventListener("click", (e) => { e.stopPropagation(); this.toggle(); }); },
};

/* ═══════════════════ NOTIFICATIONS ═══════════════════ */
const Notify = {
  push({ title, body, icon = "settings", ms = 5200 }) {
    if (State.dnd) return;
    const n = el(`<div class="notif">${makeIcon(icon)}<div><div class="notif-title">${esc(title)}</div><div class="notif-body">${esc(body)}</div></div></div>`);
    $("#notif-stack").appendChild(n);
    const kill = () => { n.classList.add("leaving"); setTimeout(() => n.remove(), 320); };
    n.addEventListener("click", kill);
    setTimeout(kill, ms);
  },
};

/* ═══════════════════ DIALOGS ═══════════════════ */
const Dialog = {
  show({ icon = "⚠️", title, message, buttons }) {
    const root = $("#dialog-root");
    const isHtmlIcon = String(icon).trim().startsWith("<");
    root.innerHTML = "";
    const dlg = el(`<div class="dialog">
        <div class="dlg-icon">${isHtmlIcon ? icon : esc(icon)}</div>
        <h3>${esc(title)}</h3>
        <p>${esc(message)}</p>
        <div class="dlg-buttons"></div>
      </div>`);
    const btnWrap = $(".dlg-buttons", dlg);
    (buttons || [{ label: "OK", primary: true }]).forEach((b) => {
      const btn = el(`<button class="dlg-btn ${b.primary ? "primary" : ""}">${esc(b.label)}</button>`);
      btn.addEventListener("click", () => { root.classList.add("hidden"); if (b.action) b.action(); });
      btnWrap.appendChild(btn);
    });
    root.appendChild(dlg);
    root.classList.remove("hidden");
  },
};

/* ═══════════════════ CLOCK / BATTERY ═══════════════════ */
const Clock = {
  start() {
    const tick = () => {
      const now = new Date();
      const dow = now.toLocaleString("en", { weekday: "short" });
      const mon = now.toLocaleString("en", { month: "short" });
      let h = now.getHours();
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      const mm = String(now.getMinutes()).padStart(2, "0");
      $("#mb-clock").textContent = `${dow} ${now.getDate()} ${mon}  ${h}:${mm} ${ampm}`;
      $("#widget-time").textContent = `${h}:${mm}`;
      $("#widget-date").textContent = `${dow}, ${mon} ${now.getDate()}`;
      $("#lock-clock").textContent = `${h}:${mm}`;
      $("#lock-date").textContent = now.toLocaleString("en", { weekday: "long", month: "long", day: "numeric" });
    };
    tick();
    setInterval(tick, 1000);
  },
};

const Battery = {
  init() {
    const render = (lvl, charging) => {
      $("#mb-battery-pct").textContent = Math.round(lvl * 100) + "%";
      $("#mb-battery-fill").setAttribute("width", Math.max(1, 20 * lvl));
      $("#mb-battery-fill").setAttribute("fill", charging ? "#32d74b" : lvl < 0.2 ? "#ff453a" : "currentColor");
    };
    if (navigator.getBattery) {
      navigator.getBattery().then((b) => {
        const up = () => render(b.level, b.charging);
        up();
        b.addEventListener("levelchange", up);
        b.addEventListener("chargingchange", up);
      }).catch(() => render(0.87, false));
    } else render(0.87, false);

    $("#mb-battery").addEventListener("click", (e) => {
      e.stopPropagation();
      const r = e.currentTarget.getBoundingClientRect();
      Menus.show([
        { label: `Battery: ${$("#mb-battery-pct").textContent}`, disabled: true },
        { label: "Power Source: Power Adapter", disabled: true },
        { sep: true },
        { label: "Battery Settings…", action: () => WM.open("settings") },
      ], r.left - 80, r.bottom + 8);
    });
    $("#mb-wifi").addEventListener("click", (e) => {
      e.stopPropagation();
      const r = e.currentTarget.getBoundingClientRect();
      Menus.show([
        { label: "Wi-Fi", shortcut: State.wifi ? "On" : "Off", action: () => { State.wifi = !State.wifi; } },
        { sep: true },
        { label: "Home_5G", checked: State.wifi, action: () => {} },
        { label: "CoffeeLab Guest", action: () => {} },
        { label: "iPhone Hotspot", action: () => {} },
        { sep: true },
        { label: "Network Settings…", action: () => WM.open("settings") },
      ], r.left - 110, r.bottom + 8);
    });
  },
};

/* ═══════════════════ POWER FLOW ═══════════════════ */
const Power = {
  booted: false,

  boot() {
    $("#boot").classList.remove("hidden", "fading");
    $("#lock").classList.add("hidden");
    $("#os").classList.add("hidden");
    $("#power-screen").classList.add("hidden");
    let p = 0;
    const bar = $("#boot-progress");
    bar.style.width = "0%";
    const iv = setInterval(() => {
      p = Math.min(100, p + 9 + Math.random() * 16);
      bar.style.width = p + "%";
      if (p >= 100) {
        clearInterval(iv);
        setTimeout(() => {
          $("#boot").classList.add("fading");
          this.lock(true);
          setTimeout(() => $("#boot").classList.add("hidden"), 750);
        }, 380);
      }
    }, 200);
  },

  lock(fromBoot) {
    const lock = $("#lock");
    lock.classList.remove("hidden", "fading");
    $("#os").classList.remove("hidden");
    const pass = $("#lock-pass");
    pass.value = "";
    setTimeout(() => pass.focus(), fromBoot ? 800 : 80);
  },

  login() {
    const lock = $("#lock");
    lock.classList.add("fading");
    setTimeout(() => lock.classList.add("hidden"), 650);
    if (!this.booted) {
      this.booted = true;
      setTimeout(() => Notify.push({
        title: "Welcome back, Ayush 👋",
        body: "Everything works — drag windows, press Ctrl+Space for Spotlight, explore the Dock.",
        icon: "finder", ms: 7000,
      }), 900);
      if (window.native) setTimeout(() => Notify.push({
        title: "Desktop app tips",
        body: "Ctrl+Q quits anytime · F11 toggles fullscreen · Finder shows your real files.",
        icon: "settings", ms: 9000,
      }), 3200);
    }
  },

  sleep() {
    MenuBar.closeMenu();
    const ps = $("#power-screen");
    $("#power-btn").classList.add("hidden");
    ps.classList.remove("hidden");
    const wake = () => {
      ps.classList.add("hidden");
      ps.removeEventListener("click", wake);
      removeEventListener("keydown", wake);
      this.lock();
    };
    setTimeout(() => {
      ps.addEventListener("click", wake);
      addEventListener("keydown", wake, { once: true });
    }, 400);
  },

  confirmRestart() {
    Dialog.show({
      icon: "🔄", title: "Are you sure you want to restart your computer?",
      message: "All open windows will close.",
      buttons: [
        { label: "Restart", primary: true, action: () => { WM.closeAll(); setTimeout(() => this.boot(), 250); } },
        { label: "Cancel" },
      ],
    });
  },

  confirmShutdown() {
    Dialog.show({
      icon: "⏻", title: "Are you sure you want to shut down?",
      message: "All open windows will close.",
      buttons: [
        { label: "Shut Down", primary: true, action: () => {
            WM.closeAll();
            const ps = $("#power-screen");
            ps.classList.remove("hidden");
            /* in the Electron desktop app, shutting down really quits */
            if (window.native) { setTimeout(() => window.native.quit(), 700); return; }
            if (navigator.userAgent.includes("Electron")) { setTimeout(() => window.close(), 700); return; }
            const btn = $("#power-btn");
            setTimeout(() => btn.classList.remove("hidden"), 600);
            btn.onclick = (e) => { e.stopPropagation(); btn.classList.add("hidden"); this.boot(); };
          } },
        { label: "Cancel" },
      ],
    });
  },
};

/* ---------- global dismissal of popovers ---------- */
addEventListener("pointerdown", (e) => {
  if (!e.target.closest("#menu-dropdown") && !e.target.closest(".mb-item")) MenuBar.closeMenu();
  if (!e.target.closest("#ctx-menu")) $("#ctx-menu").classList.add("hidden");
  if (!e.target.closest("#control-center") && !e.target.closest("#mb-cc")) ControlCenter.hide();
});
