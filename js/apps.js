/* ═══════════════════════════════════════════════════════════════
   macOS Web — apps.js
   Fake filesystem + every built-in application.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ═══════════════════ FILE SYSTEM ═══════════════════ */
const _d = (children) => ({ type: "dir", children });
const _t = (content) => ({ type: "file", kind: "text", content });
const _i = (css) => ({ type: "file", kind: "image", css });
const _f = (kind) => ({ type: "file", kind });

const FS_HOME = _d({
  "Desktop": _d({
    "Screenshot 2026-06-12.png": _i("linear-gradient(135deg,#5e72eb,#ff9190)"),
    "project-notes.txt": _t("macOS Web — project notes\n\n• Dock magnification ✓\n• Window manager ✓\n• Spotlight ✓\n• Ship it 🚀"),
  }),
  "Documents": _d({
    "Resume.txt": _t("AYUSH KUMAR\nSoftware Engineer\n\nBuilds delightful web experiences.\nCurrently rebuilding macOS… in a browser."),
    "Startup Pitch.txt": _t("We turn ambitious ideas into shipped products.\n\n1. Discover\n2. Design\n3. Deliver"),
    "Ideas.txt": _t("Ideas\n— A macOS that runs in the browser (done ✓)\n— Terminal easter eggs\n— Genie effect v2"),
    "Old Projects": _d({
      "todo-app.txt": _t("The classic. Everyone starts here."),
    }),
  }),
  "Downloads": _d({
    "claude-code-setup.dmg": _f("dmg"),
    "wallpapers.zip": _f("zip"),
    "invoice-0626.pdf": _f("pdf"),
  }),
  "Pictures": _d({
    "sunset-goa.png": _i("linear-gradient(180deg,#fcb045,#fd1d1d 70%,#833ab4)"),
    "mountains.png": _i("linear-gradient(180deg,#a8c0ff,#3f2b96)"),
    "office-party.png": _i("conic-gradient(from 210deg,#ff9a8b,#ff6a88,#ff99ac)"),
    "lake-day.png": _i("linear-gradient(180deg,#43cea2,#185a9d)"),
  }),
  "Music": _d({
    "demo-track.mp3": _f("audio"),
  }),
  "README.txt": _t("Welcome to your home folder.\nEverything here is part of the macOS Web demo filesystem.\nTry opening these files in Finder — or `cat` them in Terminal."),
});

function fsResolve(pathArr) {
  if (!pathArr.length || pathArr[0] !== "~") return null;
  let node = FS_HOME;
  for (let i = 1; i < pathArr.length; i++) {
    if (!node || node.type !== "dir" || !node.children[pathArr[i]]) return null;
    node = node.children[pathArr[i]];
  }
  return node;
}
function walkFS(node, path, cb) {
  if (node.type !== "dir") return;
  Object.entries(node.children).forEach(([name, child]) => {
    cb(child, path.concat(name), name);
    if (child.type === "dir") walkFS(child, path.concat(name), cb);
  });
}
function fileIconHTML(name, node) {
  if (node.type === "dir") return makeIcon("folder");
  if (node.kind === "image") return `<div class="fi-img-thumb" style="background:${node.css}"></div>`;
  const ext = (name.split(".").pop() || "doc").toUpperCase().slice(0, 4);
  return `<div class="fi-doc">${esc(ext)}</div>`;
}
function openFile(name, node, dirPath) {
  if (node.type === "dir") { WM.open("finder", { path: dirPath.concat(name) }); return; }
  if (node.kind === "text") WM.open("textedit", { name, content: node.content });
  else if (node.kind === "image") WM.open("preview", { name, css: node.css });
  else Dialog.show({
    icon: "📦", title: `Can't open “${name}”`,
    message: "There is no application installed in this demo that can open this kind of file.",
    buttons: [{ label: "OK", primary: true }],
  });
}

/* ═══════════════════ TRASH ═══════════════════ */
const TrashBin = {
  items: Store.get("trash", []),
  add(item) {
    this.items.push(item);
    Store.set("trash", this.items);
    Dock.refreshTrashIcon();
    this.rerender();
  },
  confirmEmpty() {
    if (!this.items.length) {
      Dialog.show({ icon: makeIcon("trash"), title: "Trash is already empty", message: "Nothing to see here.", buttons: [{ label: "OK", primary: true }] });
      return;
    }
    Dialog.show({
      icon: makeIcon("trashFull"),
      title: "Empty Trash?",
      message: `Are you sure you want to permanently erase the ${this.items.length} item(s) in the Trash? You can't undo this action.`,
      buttons: [
        { label: "Empty Trash", primary: true, action: () => { this.items = []; Store.set("trash", []); Dock.refreshTrashIcon(); this.rerender(); Notify.push({ title: "Trash", body: "Trash emptied.", icon: "trash" }); } },
        { label: "Cancel" },
      ],
    });
  },
  rerender() {
    const win = WM.wins.get("trash");
    if (win) { win.body.innerHTML = ""; APPS.trash.render(win.body, win); }
  },
};

/* ═══════════════════ REAL (WINDOWS) FILES — Electron only ═══════════════════ */
function fileUrl(p) {
  return "file:///" + encodeURI(p.replace(/\\/g, "/")).replace(/#/g, "%23").replace(/\?/g, "%3F");
}
const IMG_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "avif"];
function realIconHTML(fullPath, entry) {
  if (entry.dir) return makeIcon("folder");
  const ext = (entry.name.split(".").pop() || "").toLowerCase();
  if (IMG_EXTS.includes(ext)) return `<img class="fi-img-real" src="${fileUrl(fullPath)}" loading="lazy">`;
  if (["exe", "lnk", "msi", "bat", "cmd"].includes(ext)) return `<div class="fi-doc fi-app">APP</div>`;
  return `<div class="fi-doc">${esc((ext || "doc").toUpperCase().slice(0, 4))}</div>`;
}
const REAL_PLACES = window.native ? [
  { name: "Home", ic: "🏠", real: window.native.homeDir },
  { name: "Desktop", ic: "🖥️", real: window.native.homeDir + "\\Desktop" },
  { name: "Documents", ic: "📄", real: window.native.homeDir + "\\Documents" },
  { name: "Downloads", ic: "⬇️", real: window.native.homeDir + "\\Downloads" },
  { name: "Pictures", ic: "🖼️", real: window.native.homeDir + "\\Pictures" },
  { name: "Windows (C:)", ic: "💽", real: "C:\\" },
] : [];

/* ═══════════════════ FINDER ═══════════════════ */
const FAVORITES = [
  { name: "AirDrop", ic: "📡", special: "airdrop" },
  { name: "Applications", ic: "🅰️", special: "apps" },
  { name: "Desktop", ic: "🖥️", path: ["~", "Desktop"] },
  { name: "Documents", ic: "📄", path: ["~", "Documents"] },
  { name: "Downloads", ic: "⬇️", path: ["~", "Downloads"] },
  { name: "Pictures", ic: "🖼️", path: ["~", "Pictures"] },
  { name: "Music", ic: "🎵", path: ["~", "Music"] },
];

function renderFinder(body, win, payload) {
  body.innerHTML = `
    <div class="app-split">
      <div class="app-sidebar">
        ${REAL_PLACES.length ? `<div class="sb-section">This PC</div>` + REAL_PLACES.map((p) => `<div class="sb-row" data-real="${esc(p.real)}"><span class="sb-ic">${p.ic}</span>${esc(p.name)}</div>`).join("") : ""}
        <div class="sb-section">${REAL_PLACES.length ? "macOS Demo" : "Favourites"}</div>
        ${FAVORITES.map((f, i) => `<div class="sb-row" data-fav="${i}"><span class="sb-ic">${f.ic}</span>${f.name}</div>`).join("")}
        <div class="sb-section">Locations</div>
        <div class="sb-row" data-loc="hd"><span class="sb-ic">💽</span>Macintosh HD</div>
      </div>
      <div class="app-main">
        <div class="app-toolbar">
          <button class="tb-btn" data-nav="back" title="Back">‹</button>
          <button class="tb-btn" data-nav="fwd" title="Forward">›</button>
          <span class="tb-title" data-role="title">Home</span>
          <span class="tb-spacer"></span>
          <input class="tb-field" data-role="search" placeholder="Search" spellcheck="false">
        </div>
        <div class="finder-grid" data-role="grid"></div>
        <div class="finder-status" data-role="status"></div>
      </div>
    </div>`;

  win.addDragHandle($(".app-sidebar", body));
  win.addDragHandle($(".app-toolbar", body));

  let initView;
  if (payload && payload.path) initView = { path: payload.path };
  else if (payload && payload.real) initView = { real: payload.real };
  else if (window.native) initView = { real: window.native.homeDir };
  else initView = { path: ["~"] };
  const st = { view: initView, hist: [], hidx: -1, q: "", lastReal: null };
  win.finder = st;

  const grid = $("[data-role=grid]", body);
  const titleEl = $("[data-role=title]", body);
  const statusEl = $("[data-role=status]", body);

  function go(view, pushHist = true) {
    st.view = view;
    st.q = "";
    $("[data-role=search]", body).value = "";
    if (pushHist) {
      st.hist = st.hist.slice(0, st.hidx + 1);
      st.hist.push(view);
      st.hidx = st.hist.length - 1;
    }
    draw();
  }

  function realJoin(base, name) { return base.endsWith("\\") ? base + name : base + "\\" + name; }

  function drawReal(v) {
    titleEl.textContent = v.real.replace(/\\$/, "").split("\\").pop() || v.real;
    const renderEntries = (entries) => {
      if (st.view !== v) return;
      grid.innerHTML = "";
      let list = entries;
      if (st.q) list = list.filter((x) => x.name.toLowerCase().includes(st.q));
      if (!list.length) grid.innerHTML = `<div class="finder-empty">${st.q ? "No results" : "This folder is empty"}</div>`;
      list.forEach((entry) => {
        const full = realJoin(v.real, entry.name);
        const item = el(`<div class="f-item"><div class="fi-icon">${realIconHTML(full, entry)}</div><div class="fi-name">${esc(entry.name)}</div></div>`);
        item.addEventListener("click", () => select(item));
        item.addEventListener("dblclick", () => {
          if (entry.dir) go({ real: full });
          else window.native.openPath(full);
        });
        item.addEventListener("contextmenu", (ev) => {
          ev.preventDefault();
          Menus.context([
            { label: "Open", action: () => { if (entry.dir) go({ real: full }); else window.native.openPath(full); } },
            { label: "Show in File Explorer", action: () => window.native.reveal(full) },
          ], ev.clientX, ev.clientY);
        });
        grid.appendChild(item);
      });
      statusEl.textContent = `${list.length} item${list.length === 1 ? "" : "s"} · your real files`;
    };
    if (st.lastReal && st.lastReal.path === v.real) { renderEntries(st.lastReal.entries); return; }
    grid.innerHTML = `<div class="finder-empty">Loading…</div>`;
    window.native.readDir(v.real).then((res) => {
      if (st.view !== v) return;
      if (!Array.isArray(res)) {
        grid.innerHTML = `<div class="finder-empty">${esc((res && res.error) || "Can't open this folder")}</div>`;
        return;
      }
      res.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
      st.lastReal = { path: v.real, entries: res };
      renderEntries(res);
    });
  }

  function draw() {
    const v = st.view;
    grid.innerHTML = "";
    $$(".sb-row", body).forEach((r) => r.classList.remove("active"));

    if (v.real !== undefined) { drawReal(v); markSidebar(); return; }

    if (v.special === "airdrop") {
      titleEl.textContent = "AirDrop";
      grid.innerHTML = `<div class="finder-empty">📡<br><br>No one nearby.<br><span style="font-size:12px">AirDrop only reaches real Macs — this one lives in a browser tab.</span></div>`;
      statusEl.textContent = "0 people";
      markSidebar();
      return;
    }
    if (v.special === "apps") {
      titleEl.textContent = "Applications";
      let n = 0;
      Object.values(APPS).forEach((a) => {
        if (a.launchpad === false) return;
        n++;
        const item = el(`<div class="f-item"><div class="fi-icon">${makeIcon(a.icon)}</div><div class="fi-name">${esc(a.name)}</div></div>`);
        item.addEventListener("dblclick", () => WM.open(a.id));
        item.addEventListener("click", () => select(item));
        grid.appendChild(item);
      });
      statusEl.textContent = `${n} applications`;
      markSidebar();
      return;
    }

    const node = fsResolve(v.path);
    titleEl.textContent = v.path.length === 1 ? "ayush" : v.path[v.path.length - 1];
    if (!node || node.type !== "dir") { grid.innerHTML = `<div class="finder-empty">Folder not found</div>`; return; }

    let entries = Object.entries(node.children);
    if (st.q) entries = entries.filter(([n2]) => n2.toLowerCase().includes(st.q));
    if (!entries.length) grid.innerHTML = `<div class="finder-empty">${st.q ? "No results" : "This folder is empty"}</div>`;
    entries.forEach(([name, child]) => {
      const item = el(`<div class="f-item"><div class="fi-icon">${fileIconHTML(name, child)}</div><div class="fi-name">${esc(name)}</div></div>`);
      item.addEventListener("click", () => select(item));
      item.addEventListener("dblclick", () => {
        if (child.type === "dir") go({ path: v.path.concat(name) });
        else openFile(name, child, v.path);
      });
      grid.appendChild(item);
    });
    statusEl.textContent = `${entries.length} item${entries.length === 1 ? "" : "s"} · 248.5 GB available`;
    markSidebar();
  }

  function markSidebar() {
    const v = st.view;
    $$(".sb-row[data-real]", body).forEach((row) => {
      row.classList.toggle("active", v.real !== undefined && row.dataset.real === v.real);
    });
    FAVORITES.forEach((f, i) => {
      const row = $(`[data-fav="${i}"]`, body);
      const match = f.special ? v.special === f.special : (v.path && v.path.join("/") === f.path.join("/"));
      row.classList.toggle("active", !!match);
    });
    $(`[data-loc=hd]`, body).classList.toggle("active", !!(v.path && v.path.length === 1));
  }

  function select(item) {
    $$(".f-item", grid).forEach((x) => x.classList.remove("selected"));
    item.classList.add("selected");
  }

  $$(".sb-row[data-fav]", body).forEach((row) => {
    row.addEventListener("click", () => {
      const f = FAVORITES[+row.dataset.fav];
      go(f.special ? { special: f.special } : { path: f.path.slice() });
    });
  });
  $$(".sb-row[data-real]", body).forEach((row) => {
    row.addEventListener("click", () => go({ real: row.dataset.real }));
  });
  $("[data-loc=hd]", body).addEventListener("click", () => go({ path: ["~"] }));
  $("[data-nav=back]", body).addEventListener("click", () => { if (st.hidx > 0) { st.hidx--; st.view = st.hist[st.hidx]; draw(); } });
  $("[data-nav=fwd]", body).addEventListener("click", () => { if (st.hidx < st.hist.length - 1) { st.hidx++; st.view = st.hist[st.hidx]; draw(); } });
  $("[data-role=search]", body).addEventListener("input", (e) => { st.q = e.target.value.trim().toLowerCase(); draw(); });

  go(st.view);
}

/* ═══════════════════ SAFARI ═══════════════════ */
const SAFARI_FAVS = [
  { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/MacOS", bg: "linear-gradient(135deg,#5d6874,#2c333b)", glyph: "W" },
  { name: "DuckDuckGo", url: "https://lite.duckduckgo.com/lite/", bg: "linear-gradient(135deg,#ff7745,#de5833)", glyph: "🦆" },
  { name: "OpenStreetMap", url: "https://www.openstreetmap.org/export/embed.html?bbox=76.9,28.3,77.4,28.8", bg: "linear-gradient(135deg,#9bd668,#5a9e3a)", glyph: "🗺" },
  { name: "Example", url: "https://example.com", bg: "linear-gradient(135deg,#6a85b6,#bac8e0)", glyph: "🌐" },
  { name: "Wiki: Apple", url: "https://en.wikipedia.org/wiki/Apple_Inc.", bg: "linear-gradient(135deg,#aeb6bf,#717d8a)", glyph: "🍎" },
];

function renderSafari(body, win) {
  body.innerHTML = `
    <div class="app-main" style="width:100%">
      <div class="app-toolbar safari-toolbar">
        <button class="tb-btn" data-nav="back">‹</button>
        <button class="tb-btn" data-nav="fwd">›</button>
        <button class="tb-btn" data-nav="reload" title="Reload">⟳</button>
        <div class="safari-url">
          <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" opacity=".4"><path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1zm2 5H6V4.5a2 2 0 1 1 4 0V6z"/></svg>
          <input data-role="url" placeholder="Search or enter website name" spellcheck="false" autocomplete="off">
        </div>
        <button class="tb-btn" data-nav="home" title="Start page">⌂</button>
      </div>
      <div class="safari-body">
        <iframe data-role="frame" class="hidden" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
        <div class="safari-start" data-role="start">
          <h2>Favourites</h2>
          <div class="fav-grid">
            ${SAFARI_FAVS.map((f, i) => `<div class="fav-tile" data-fav="${i}"><div class="fav-ic" style="background:${f.bg}">${f.glyph}</div><span>${esc(f.name)}</span></div>`).join("")}
          </div>
          <div class="safari-note">
            <b>Heads up:</b> this Safari renders real websites inside a frame. Some sites
            (Google, YouTube, Instagram…) refuse to be embedded and will stay blank —
            that's their security policy, not a bug. The favourites above all work.
            Anything you type that isn't a URL is searched on DuckDuckGo.
          </div>
        </div>
      </div>
    </div>`;

  win.addDragHandle($(".app-toolbar", body));
  const frame = $("[data-role=frame]", body);
  const start = $("[data-role=start]", body);
  const urlIn = $("[data-role=url]", body);
  const hist = []; let hidx = -1;

  function navigate(url, push = true) {
    if (!/^https?:\/\//i.test(url)) {
      if (/^[\w-]+(\.[\w-]+)+/.test(url)) url = "https://" + url;
      else url = "https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent(url);
    }
    frame.src = url;
    frame.classList.remove("hidden");
    start.classList.add("hidden");
    urlIn.value = url;
    if (push) { hist.splice(hidx + 1); hist.push(url); hidx = hist.length - 1; }
    win.setTitle("Safari — " + url.replace(/^https?:\/\//, "").split("/")[0]);
  }
  function home() {
    frame.classList.add("hidden");
    frame.src = "about:blank";
    start.classList.remove("hidden");
    urlIn.value = "";
    win.setTitle("Safari");
  }

  $$(".fav-tile", body).forEach((t) => t.addEventListener("click", () => navigate(SAFARI_FAVS[+t.dataset.fav].url)));
  urlIn.addEventListener("keydown", (e) => { if (e.key === "Enter" && urlIn.value.trim()) navigate(urlIn.value.trim()); });
  $("[data-nav=back]", body).addEventListener("click", () => { if (hidx > 0) { hidx--; navigate(hist[hidx], false); } else home(); });
  $("[data-nav=fwd]", body).addEventListener("click", () => { if (hidx < hist.length - 1) { hidx++; navigate(hist[hidx], false); } });
  $("[data-nav=reload]", body).addEventListener("click", () => { if (!frame.classList.contains("hidden")) frame.src = frame.src; });
  $("[data-nav=home]", body).addEventListener("click", home);
}

/* ═══════════════════ NOTES ═══════════════════ */
const NotesApp = {
  notes: Store.get("notes", [
    { id: 1, body: "Welcome to Notes 📝\n\nEverything you type here is saved automatically in your browser.\n\nTry:\n• Creating a new note (+ button)\n• Deleting this one (🗑)\n• It all persists across reloads.", ts: Date.now() - 86400000 },
    { id: 2, body: "Shopping list\n\n– Coffee beans\n– USB-C cable\n– A real MacBook (someday)", ts: Date.now() - 3600000 },
  ]),
  sel: null, win: null,

  persist() { Store.set("notes", this.notes); },
  title(n) { return (n.body.split("\n")[0] || "New Note").slice(0, 40); },
  preview(n) { return (n.body.split("\n").slice(1).find((l) => l.trim()) || "No additional text").slice(0, 60); },

  render(body, win) {
    this.win = win;
    body.innerHTML = `
      <div class="app-main" style="width:100%">
        <div class="app-toolbar">
          <button class="tb-btn" data-act="new" title="New note">✎</button>
          <button class="tb-btn" data-act="del" title="Delete note">🗑</button>
          <span class="tb-title">Notes</span>
          <span class="tb-spacer"></span>
        </div>
        <div class="app-split" style="flex:1;min-height:0">
          <div class="notes-list" data-role="list"></div>
          <div class="notes-editor">
            <div class="notes-date" data-role="date"></div>
            <div class="note-area" data-role="area" contenteditable="true" spellcheck="false"></div>
          </div>
        </div>
      </div>`;
    $("[data-act=new]", body).addEventListener("click", () => this.create());
    $("[data-act=del]", body).addEventListener("click", () => this.removeCurrent());
    const area = $("[data-role=area]", body);
    area.addEventListener("input", () => {
      const n = this.notes.find((x) => x.id === this.sel);
      if (!n) return;
      n.body = area.innerText;
      n.ts = Date.now();
      this.persist();
      this.drawList();
    });
    if (!this.sel && this.notes.length) this.sel = this.notes[0].id;
    this.drawList();
    this.show(this.sel);
  },

  drawList() {
    if (!this.win) return;
    const list = $("[data-role=list]", this.win.body);
    if (!list) return;
    const sorted = [...this.notes].sort((a, b) => b.ts - a.ts);
    list.innerHTML = "";
    sorted.forEach((n) => {
      const cell = el(`<div class="note-cell ${n.id === this.sel ? "active" : ""}">
          <div class="n-title">${esc(this.title(n))}</div>
          <div class="n-prev">${esc(this.preview(n))}</div>
          <div class="n-date">${new Date(n.ts).toLocaleDateString("en", { month: "short", day: "numeric" })}</div>
        </div>`);
      cell.addEventListener("click", () => this.show(n.id));
      list.appendChild(cell);
    });
  },

  show(id) {
    if (!this.win) return;
    const n = this.notes.find((x) => x.id === id);
    this.sel = n ? n.id : null;
    const area = $("[data-role=area]", this.win.body);
    const date = $("[data-role=date]", this.win.body);
    if (!area) return;
    area.innerText = n ? n.body : "";
    date.textContent = n ? new Date(n.ts).toLocaleString("en", { dateStyle: "long", timeStyle: "short" }) : "";
    this.drawList();
  },

  create() {
    if (!WM.wins.get("notes")) WM.open("notes");
    const n = { id: Date.now(), body: "", ts: Date.now() };
    this.notes.unshift(n);
    this.persist();
    this.show(n.id);
    const area = $("[data-role=area]", this.win.body);
    if (area) area.focus();
  },

  removeCurrent() {
    const n = this.notes.find((x) => x.id === this.sel);
    if (!n) return;
    Dialog.show({
      icon: makeIcon("notes"), title: `Delete “${this.title(n)}”?`, message: "This note will be moved to the Trash.",
      buttons: [
        { label: "Delete", primary: true, action: () => {
            this.notes = this.notes.filter((x) => x.id !== n.id);
            TrashBin.add({ name: this.title(n) + ".note", icon: "notes" });
            this.persist();
            this.sel = this.notes.length ? this.notes[0].id : null;
            this.show(this.sel);
          } },
        { label: "Cancel" },
      ],
    });
  },
};

/* ═══════════════════ CALCULATOR ═══════════════════ */
function renderCalculator(body, win) {
  body.innerHTML = `
    <div class="calc">
      <div class="calc-display" data-role="disp">0</div>
      <div class="calc-pad">
        ${[
          ["AC", "fn", "ac"], ["±", "fn", "neg"], ["%", "fn", "pct"], ["÷", "op", "/"],
          ["7", "", "7"], ["8", "", "8"], ["9", "", "9"], ["×", "op", "*"],
          ["4", "", "4"], ["5", "", "5"], ["6", "", "6"], ["−", "op", "-"],
          ["1", "", "1"], ["2", "", "2"], ["3", "", "3"], ["+", "op", "+"],
          ["0", "zero", "0"], [".", "", "."], ["=", "op", "="],
        ].map(([l, c, k]) => `<button class="calc-btn ${c}" data-k="${k}">${l}</button>`).join("")}
      </div>
    </div>`;
  win.addDragHandle($(".calc-display", body));

  const disp = $("[data-role=disp]", body);
  const st = { cur: "0", acc: null, op: null, fresh: true };

  function show(v) {
    let s = String(v);
    if (s.length > 10 && !isNaN(+s)) s = (+s).toPrecision(8).replace(/\.?0+(e|$)/, "$1");
    disp.textContent = s;
    disp.style.fontSize = s.length > 8 ? "34px" : "52px";
  }
  function calc(a, b, op) {
    a = +a; b = +b;
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (op === "/") return b === 0 ? "Error" : a / b;
    return b;
  }
  function press(k) {
    if (/[0-9]/.test(k)) {
      st.cur = st.fresh || st.cur === "0" ? k : st.cur + k;
      st.fresh = false;
    } else if (k === ".") {
      if (st.fresh) { st.cur = "0."; st.fresh = false; }
      else if (!st.cur.includes(".")) st.cur += ".";
    } else if (k === "ac") {
      Object.assign(st, { cur: "0", acc: null, op: null, fresh: true });
      $$(".calc-btn.op", body).forEach((b) => b.classList.remove("selected"));
    } else if (k === "neg") st.cur = String(-+st.cur);
    else if (k === "pct") st.cur = String(+st.cur / 100);
    else if (k === "=") {
      if (st.op !== null && st.acc !== null) {
        st.cur = String(calc(st.acc, st.cur, st.op));
        st.acc = null; st.op = null; st.fresh = true;
      }
      $$(".calc-btn.op", body).forEach((b) => b.classList.remove("selected"));
    } else { /* operator */
      if (st.op && !st.fresh && st.acc !== null) st.cur = String(calc(st.acc, st.cur, st.op));
      st.acc = st.cur; st.op = k; st.fresh = true;
      $$(".calc-btn.op", body).forEach((b) => b.classList.toggle("selected", b.dataset.k === k));
    }
    show(st.cur);
  }

  $$(".calc-btn", body).forEach((b) => b.addEventListener("click", () => press(b.dataset.k)));
  win.calcKey = (e) => {
    const map = { Enter: "=", "=": "=", Escape: "ac", "%": "pct", "+": "+", "-": "-", "*": "*", "/": "/", ".": "." };
    if (/[0-9]/.test(e.key)) press(e.key);
    else if (map[e.key] !== undefined) { e.preventDefault(); press(map[e.key]); }
    else if (e.key === "Backspace") { st.cur = st.cur.length > 1 ? st.cur.slice(0, -1) : "0"; show(st.cur); }
  };
}

/* ═══════════════════ TERMINAL ═══════════════════ */
function renderTerminal(body, win) {
  body.innerHTML = `<div class="terminal" data-role="term"></div>`;
  const term = $("[data-role=term]", body);
  let cwd = ["~"];
  const history = []; let hIdx = 0;

  const promptHTML = () =>
    `<span class="t-green">ayush@${State.host.split("-")[0]}</span> <span class="t-cyan">${cwd.length === 1 ? "~" : cwd[cwd.length - 1]}</span> <span class="t-dim">%</span> `;

  function print(html = "") { term.insertAdjacentHTML("beforeend", `<div class="term-line">${html}</div>`); }
  function newPrompt() {
    const row = el(`<div class="term-line term-input-row">${promptHTML()}<input class="term-input" spellcheck="false" autocomplete="off"></div>`);
    term.appendChild(row);
    const inp = $("input", row);
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const cmd = inp.value;
        inp.disabled = true;
        row.innerHTML = promptHTML() + esc(cmd);
        if (cmd.trim()) { history.push(cmd); hIdx = history.length; }
        exec(cmd.trim());
      } else if (e.key === "ArrowUp") { e.preventDefault(); if (hIdx > 0) inp.value = history[--hIdx]; }
      else if (e.key === "ArrowDown") { e.preventDefault(); inp.value = hIdx < history.length - 1 ? history[++hIdx] : (hIdx = history.length, ""); }
      else if (e.key === "c" && e.ctrlKey) { row.innerHTML = promptHTML() + esc(inp.value) + "^C"; newPrompt(); }
    });
    inp.focus();
    term.scrollTop = term.scrollHeight;
  }

  function resolve(input) {
    let parts = input === "~" ? ["~"] : input.split("/").filter(Boolean);
    let path = input.startsWith("~") || input.startsWith("/") ? ["~"] : cwd.slice();
    parts.forEach((p) => {
      if (p === "~" || p === "") return;
      if (p === "..") { if (path.length > 1) path.pop(); }
      else if (p !== ".") path.push(p);
    });
    return { node: fsResolve(path), path };
  }

  function exec(cmd) {
    const [c, ...args] = cmd.split(/\s+/);
    const arg = args.join(" ");
    switch (c) {
      case "": break;
      case "help":
        print(`Available commands:`);
        print(`  <span class="t-cyan">ls cd pwd cat echo clear date whoami hostname uname</span>`);
        print(`  <span class="t-cyan">open &lt;app&gt;   say &lt;text&gt;   neofetch   history   exit</span>`);
        break;
      case "clear": term.innerHTML = ""; break;
      case "pwd": print(esc("/Users/ayush" + (cwd.length > 1 ? "/" + cwd.slice(1).join("/") : ""))); break;
      case "ls": {
        const { node } = resolve(arg || ".");
        if (!node) print(`ls: ${esc(arg)}: No such file or directory`);
        else if (node.type !== "dir") print(esc(arg));
        else print(Object.entries(node.children).map(([n, ch]) =>
          ch.type === "dir" ? `<span class="t-cyan">${esc(n)}/</span>` : esc(n)).join("   ") || "<span class='t-dim'>(empty)</span>");
        break;
      }
      case "cd": {
        if (!arg || arg === "~") { cwd = ["~"]; break; }
        const { node, path } = resolve(arg);
        if (node && node.type === "dir") cwd = path;
        else print(`cd: no such directory: ${esc(arg)}`);
        break;
      }
      case "cat": {
        if (!arg) { print("usage: cat <file>"); break; }
        const { node } = resolve(arg);
        if (!node) print(`cat: ${esc(arg)}: No such file or directory`);
        else if (node.type === "dir") print(`cat: ${esc(arg)}: Is a directory`);
        else if (node.kind === "text") node.content.split("\n").forEach((l) => print(esc(l)));
        else print(`cat: ${esc(arg)}: binary file`);
        break;
      }
      case "echo": print(esc(arg)); break;
      case "date": print(esc(new Date().toString())); break;
      case "whoami": print("ayush"); break;
      case "hostname": print(esc(State.host)); break;
      case "uname": print(args.includes("-a") ? "Darwin Ayushs-MacBook-Pro 25.0.0 ClaudeKernel Web x86_64" : "Darwin"); break;
      case "history": history.forEach((h, i) => print(`  ${i + 1}  ${esc(h)}`)); break;
      case "open": {
        const q = arg.toLowerCase();
        const app = Object.values(APPS).find((a) => a.id === q || a.name.toLowerCase() === q);
        if (app) { print(`Opening ${esc(app.name)}…`); WM.open(app.id); }
        else print(`open: unknown application: ${esc(arg)}`);
        break;
      }
      case "say":
        if ("speechSynthesis" in window && arg) { speechSynthesis.speak(new SpeechSynthesisUtterance(arg)); print(`<span class="t-dim">🔊 speaking…</span>`); }
        else print("usage: say <text>");
        break;
      case "neofetch": {
        const up = Math.round(performance.now() / 60000);
        const rows = [
          ["", ""], ["<span class='t-green'>ayush</span>@<span class='t-green'>" + esc(State.host) + "</span>", ""],
          ["─────────────────────────", ""],
          ["<span class='t-yellow'>OS</span>", "macOS Web 1.0 Sequoia (browser)"],
          ["<span class='t-yellow'>Host</span>", "MacBook Pro (Web Edition)"],
          ["<span class='t-yellow'>Kernel</span>", "ClaudeKernel 5.0"],
          ["<span class='t-yellow'>Uptime</span>", up + " min"],
          ["<span class='t-yellow'>Shell</span>", "zsh (cosplay)"],
          ["<span class='t-yellow'>Resolution</span>", innerWidth + "x" + innerHeight],
          ["<span class='t-yellow'>Memory</span>", "Pure imagination"],
        ];
        const apple = ["    .:'   ", " __ :'__  ", ".'`  `-'  ", ":          ", ":          ", " :       ` ", "  `:.    .'", "    `''''  "];
        rows.forEach((r, i) => print(`<span class="t-green">${apple[i] || "           "}</span>  ${r[0]}${r[1] ? "<span class='t-dim'>:</span> " + r[1] : ""}`));
        print("");
        break;
      }
      case "sudo":
        if (args.join(" ").startsWith("rm -rf /")) { print(`<span class="t-red">Deleting everything…</span>`); print(`<span class="t-red">██████████ 100%</span>`); print(`Phew — just kidding. This is a web demo, nothing was harmed. 😅`); }
        else print("ayush is not in the sudoers file. This incident will be reported. (to no one)");
        break;
      case "rm":
        if (arg.replace(/\s+/g, " ").includes("-rf /")) { print(`<span class="t-red">rm: it would be a shame if something happened to this lovely demo…</span>`); print("Operation cancelled by common sense."); }
        else print("rm: read-only demo filesystem");
        break;
      case "exit": WM.close("terminal"); return;
      default:
        print(`zsh: command not found: ${esc(c)}  <span class="t-dim">(try “help”)</span>`);
    }
    newPrompt();
  }

  print(`Last login: ${esc(new Date().toDateString())} on ttys000`);
  print(`Welcome to <span class="t-green">macOS Web Terminal</span> — type <span class="t-yellow">help</span> or <span class="t-yellow">neofetch</span>.`);
  newPrompt();
  term.addEventListener("click", (e) => {
    if (window.getSelection().toString()) return;
    const inp = $(".term-input:not([disabled])", term);
    if (inp) inp.focus();
  });
}

/* ═══════════════════ CALENDAR ═══════════════════ */
function renderCalendarApp(body, win) {
  body.innerHTML = `
    <div class="cal-app">
      <div class="cal-head">
        <span class="cal-mname" data-role="m"></span><span class="cal-year" data-role="y"></span>
        <div class="cal-nav">
          <button data-nav="-1">‹</button><button data-nav="0">Today</button><button data-nav="1">›</button>
        </div>
      </div>
      <div class="cal-grid-head">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<div>${d}</div>`).join("")}</div>
      <div class="cal-grid" data-role="grid"></div>
    </div>`;

  const today = new Date();
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  const EVENTS = { 5: "Design review", 12: "🚀 Demo Day", 18: "1:1 with Rohan", 25: "Sprint end" };

  function draw() {
    $("[data-role=m]", body).textContent = view.toLocaleString("en", { month: "long" });
    $("[data-role=y]", body).textContent = view.getFullYear();
    const grid = $("[data-role=grid]", body);
    grid.innerHTML = "";
    const first = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
    const dim = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const prevDim = new Date(view.getFullYear(), view.getMonth(), 0).getDate();
    const isThisMonth = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth();
    for (let i = 0; i < 42; i++) {
      const dayNum = i - first + 1;
      let label, dimmed = false;
      if (dayNum < 1) { label = prevDim + dayNum; dimmed = true; }
      else if (dayNum > dim) { label = dayNum - dim; dimmed = true; }
      else label = dayNum;
      const isToday = isThisMonth && !dimmed && label === today.getDate();
      const evt = !dimmed && isThisMonth && EVENTS[label];
      grid.appendChild(el(`<div class="cal-cell ${dimmed ? "dim" : ""} ${isToday ? "today" : ""}">
        <span class="d-num">${label}</span>${evt ? `<span class="evt">${evt}</span>` : ""}</div>`));
    }
  }
  $$(".cal-nav button", body).forEach((b) => b.addEventListener("click", () => {
    const d = +b.dataset.nav;
    view = d === 0 ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(view.getFullYear(), view.getMonth() + d, 1);
    draw();
  }));
  draw();
}

/* ═══════════════════ PHOTOS ═══════════════════ */
const PHOTO_LIB = Array.from({ length: 18 }, (_, i) => {
  const h = (i * 47) % 360;
  const styles = [
    `linear-gradient(135deg, hsl(${h},82%,62%), hsl(${(h + 50) % 360},78%,42%))`,
    `radial-gradient(120% 120% at 20% 20%, hsl(${h},90%,70%), hsl(${(h + 70) % 360},70%,35%))`,
    `conic-gradient(from ${h}deg, hsl(${h},80%,60%), hsl(${(h + 120) % 360},75%,55%), hsl(${h},80%,60%))`,
  ];
  return styles[i % 3];
});

function renderPhotos(body, win) {
  body.innerHTML = `
    <div class="app-main" style="width:100%">
      <div class="app-toolbar"><span class="tb-title">Library</span><span class="tb-spacer"></span><span class="trash-toolbar-note">${PHOTO_LIB.length} Photos</span></div>
      <div class="photos-grid">
        ${PHOTO_LIB.map((css, i) => `<div class="photo" data-i="${i}" style="background:${css}"></div>`).join("")}
      </div>
    </div>`;
  $$(".photo", body).forEach((p) => p.addEventListener("click", () => {
    const viewer = el(`<div class="photo-viewer">
        <div class="pv-img" style="background:${PHOTO_LIB[+p.dataset.i]}"></div>
        <button class="pv-close">Done</button>
      </div>`);
    viewer.addEventListener("click", (e) => { if (e.target === viewer || e.target.classList.contains("pv-close")) viewer.remove(); });
    body.firstElementChild.appendChild(viewer);
  }));
}

/* ═══════════════════ MUSIC ═══════════════════ */
const TRACKS = [
  { name: "Aurora Drift", artist: "Sequoia Beats", dur: 154, emoji: "🌌", css: "linear-gradient(135deg,#5e72eb,#ff9190)", bpm: 92, wave: "triangle", notes: [220, 261.63, 329.63, 392, 329.63, 261.63, 293.66, 246.94] },
  { name: "Golden Hour", artist: "Cupertino Club", dur: 187, emoji: "🌅", css: "linear-gradient(135deg,#fcb045,#fd1d1d)", bpm: 108, wave: "square", notes: [261.63, 329.63, 392, 523.25, 392, 329.63, 349.23, 293.66] },
  { name: "Night Drive", artist: "Neon Freeway", dur: 201, emoji: "🌃", css: "linear-gradient(135deg,#0f0c29,#7303c0)", bpm: 120, wave: "sawtooth", notes: [174.61, 220, 261.63, 220, 293.66, 261.63, 220, 196] },
  { name: "Redwood Rain", artist: "Lo-Fi Forest", dur: 176, emoji: "🌧", css: "linear-gradient(135deg,#134e5e,#71b280)", bpm: 76, wave: "sine", notes: [196, 246.94, 293.66, 329.63, 293.66, 246.94, 220, 174.61] },
  { name: "Infinite Loop", artist: "One More Thing", dur: 162, emoji: "♾️", css: "linear-gradient(135deg,#8e2de2,#4a00e0)", bpm: 100, wave: "triangle", notes: [261.63, 311.13, 392, 466.16, 392, 311.13, 349.23, 293.66] },
];

const MusicPlayer = {
  ctx: null, master: null, idx: 0, playing: false, step: 0, pos: 0, stepIv: null, posIv: null, winBody: null,

  ensure() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = State.volume * 0.45;
    this.master.connect(this.ctx.destination);
  },
  setVolume(v) { if (this.master) this.master.gain.value = v * 0.45; },

  note(freq, dur, type, gainMul = 1) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28 * gainMul, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.05);
  },

  play(i) {
    this.ensure();
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (i !== undefined && i !== this.idx) { this.idx = i; this.pos = 0; this.step = 0; }
    if (this.playing) return this.updateUI();
    this.playing = true;
    const tr = TRACKS[this.idx];
    const stepMs = (60 / tr.bpm / 2) * 1000;
    this.stepIv = setInterval(() => {
      const tr2 = TRACKS[this.idx];
      const f = tr2.notes[this.step % tr2.notes.length];
      this.note(f, 0.34, tr2.wave);
      if (this.step % 4 === 0) this.note(f / 2, 0.6, "sine", 1.5);
      if (this.step % 8 === 4) this.note(f * 2, 0.18, tr2.wave, 0.4);
      this.step++;
    }, stepMs);
    this.posIv = setInterval(() => {
      this.pos += 0.25;
      if (this.pos >= TRACKS[this.idx].dur) this.next();
      this.updateUI(true);
    }, 250);
    this.updateUI();
  },

  pause() {
    this.playing = false;
    clearInterval(this.stepIv); clearInterval(this.posIv);
    this.updateUI();
  },
  toggle() { this.playing ? this.pause() : this.play(); },
  next() { const was = this.playing; this.pause(); this.idx = (this.idx + 1) % TRACKS.length; this.pos = 0; this.step = 0; if (was) this.play(); else this.updateUI(); },
  prev() { const was = this.playing; this.pause(); this.idx = (this.idx - 1 + TRACKS.length) % TRACKS.length; this.pos = 0; this.step = 0; if (was) this.play(); else this.updateUI(); },

  fmt(s) { return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); },

  updateUI(posOnly = false) {
    const b = this.winBody;
    if (!b || !b.isConnected) return;
    const tr = TRACKS[this.idx];
    $("[data-role=mp-fill]", b).style.width = (this.pos / tr.dur) * 100 + "%";
    $("[data-role=mp-cur]", b).textContent = this.fmt(this.pos);
    $("[data-role=mp-tot]", b).textContent = this.fmt(tr.dur);
    if (posOnly) return;
    $("[data-role=mp-art]", b).style.background = tr.css;
    $("[data-role=mp-art]", b).textContent = tr.emoji;
    $("[data-role=mp-title]", b).textContent = tr.name;
    $("[data-role=mp-artist]", b).textContent = tr.artist;
    $("[data-role=mp-play]", b).textContent = this.playing ? "⏸" : "▶";
    $$(".track", b).forEach((t, i) => t.classList.toggle("playing", i === this.idx));
  },
};

function renderMusic(body, win) {
  body.innerHTML = `
    <div class="app-split">
      <div class="app-sidebar">
        <div class="sb-section">Library</div>
        <div class="sb-row active"><span class="sb-ic">🎵</span>Songs</div>
        <div class="sb-row"><span class="sb-ic">🧑‍🎤</span>Artists</div>
        <div class="sb-row"><span class="sb-ic">💿</span>Albums</div>
        <div class="sb-section">Playlists</div>
        <div class="sb-row"><span class="sb-ic">🔥</span>Heavy Rotation</div>
        <div class="sb-row"><span class="sb-ic">🌙</span>Late Night Code</div>
      </div>
      <div class="music-main">
        <div class="music-now">
          <div class="music-art" data-role="mp-art"></div>
          <div class="music-meta">
            <div class="m-title" data-role="mp-title"></div>
            <div class="m-artist" data-role="mp-artist"></div>
            <div class="music-progress" data-role="mp-bar"><div class="mp-fill" data-role="mp-fill"></div></div>
            <div class="music-times"><span data-role="mp-cur">0:00</span><span data-role="mp-tot">0:00</span></div>
          </div>
          <div class="music-controls">
            <button data-act="prev">⏮</button>
            <button class="m-play" data-act="play" data-role="mp-play">▶</button>
            <button data-act="next">⏭</button>
          </div>
        </div>
        <div class="track-list">
          ${TRACKS.map((t, i) => `
            <div class="track" data-i="${i}">
              <div class="t-art" style="background:${t.css}">${t.emoji}</div>
              <div><div class="t-name">${esc(t.name)}</div><div class="t-artist">${esc(t.artist)}</div></div>
              <span class="t-dur">${MusicPlayer.fmt(t.dur)}</span>
            </div>`).join("")}
        </div>
      </div>
    </div>`;

  win.addDragHandle($(".app-sidebar", body));
  win.addDragHandle($(".music-now", body));
  MusicPlayer.winBody = body;
  $("[data-act=play]", body).addEventListener("click", () => MusicPlayer.toggle());
  $("[data-act=next]", body).addEventListener("click", () => MusicPlayer.next());
  $("[data-act=prev]", body).addEventListener("click", () => MusicPlayer.prev());
  $("[data-role=mp-bar]", body).addEventListener("click", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    MusicPlayer.pos = ((e.clientX - r.left) / r.width) * TRACKS[MusicPlayer.idx].dur;
    MusicPlayer.updateUI(true);
  });
  $$(".track", body).forEach((t) => t.addEventListener("dblclick", () => { MusicPlayer.pause(); MusicPlayer.play(+t.dataset.i); }));
  MusicPlayer.updateUI();
}

/* ═══════════════════ MESSAGES ═══════════════════ */
const CONTACTS = [
  { name: "Rohan Mehta", emoji: "🧑‍💼", hue: 210,
    msgs: [{ me: false, text: "Hey Ayush, how's the macOS web project going?" }, { me: true, text: "Almost done! Dock, windows, terminal — everything works 🚀" }, { me: false, text: "Wow. Demo it at standup tomorrow?" }],
    replies: ["Looks awesome! 🔥", "Ship it 🚀", "Can you add dark mode too?", "The dock animation is so smooth!"] },
  { name: "Priya Sharma", emoji: "👩‍💻", hue: 130,
    msgs: [{ me: false, text: "Bro the terminal even has neofetch 😂" }, { me: true, text: "Try `sudo rm -rf /` in it" }],
    replies: ["LOL 😂", "okay that's brilliant", "PR approved ✅", "one more thing…"] },
  { name: "Mom ❤️", emoji: "👩", hue: 340,
    msgs: [{ me: false, text: "Beta, did you have lunch?" }],
    replies: ["Don't skip meals!", "Call me tonight 📞", "Proud of you ❤️"] },
];

function renderMessages(body, win) {
  body.innerHTML = `
    <div class="app-split">
      <div class="app-sidebar" style="width:225px">
        <div class="sb-section">Messages</div>
        <div data-role="chats"></div>
      </div>
      <div class="chat-pane">
        <div class="chat-scroll" data-role="scroll"></div>
        <div class="chat-inputbar">
          <input data-role="msg" placeholder="iMessage" spellcheck="false">
          <button class="chat-send" data-act="send">↑</button>
        </div>
      </div>
    </div>`;
  win.addDragHandle($(".app-sidebar", body));

  let sel = 0;
  const chatsEl = $("[data-role=chats]", body);
  const scroll = $("[data-role=scroll]", body);
  const input = $("[data-role=msg]", body);

  function drawList() {
    chatsEl.innerHTML = "";
    CONTACTS.forEach((c, i) => {
      const last = c.msgs[c.msgs.length - 1];
      const cell = el(`<div class="chat-cell ${i === sel ? "active" : ""}">
          <div class="chat-avatar" style="background:hsl(${c.hue},65%,55%)">${c.emoji}</div>
          <div><div class="c-name">${esc(c.name)}</div><div class="c-prev">${esc(last ? last.text : "")}</div></div>
        </div>`);
      cell.addEventListener("click", () => { sel = i; drawList(); drawChat(); });
      chatsEl.appendChild(cell);
    });
  }
  function drawChat() {
    const c = CONTACTS[sel];
    scroll.innerHTML = c.msgs.map((m) => `<div class="bubble ${m.me ? "me" : ""}">${esc(m.text)}</div>`).join("");
    scroll.scrollTop = scroll.scrollHeight;
  }
  function send() {
    const text = input.value.trim();
    if (!text) return;
    const c = CONTACTS[sel];
    c.msgs.push({ me: true, text });
    input.value = "";
    drawChat(); drawList();
    const typing = el(`<div class="bubble typing">•••</div>`);
    setTimeout(() => { scroll.appendChild(typing); scroll.scrollTop = scroll.scrollHeight; }, 600);
    setTimeout(() => {
      typing.remove();
      const reply = c.replies[Math.floor(Math.random() * c.replies.length)];
      c.msgs.push({ me: false, text: reply });
      drawChat(); drawList();
      if (WM.activeId !== "messages") Notify.push({ title: c.name, body: reply, icon: "messages" });
    }, 1700 + Math.random() * 900);
  }
  $("[data-act=send]", body).addEventListener("click", send);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
  drawList(); drawChat();
}

/* ═══════════════════ MAIL ═══════════════════ */
const MAILS = [
  { from: "Apple", subj: "Your receipt from Apple", time: "9:12 AM", unread: true,
    body: "Dear Ayush,\n\nThank you for your purchase of macOS Web Edition (Free).\n\nTotal: ₹0.00\n\nNo receipt is necessary because, well, it's a browser tab.\n\n— Apple (not really)" },
  { from: "GitHub", subj: "[mac-os] Your build passed ✅", time: "8:47 AM", unread: true,
    body: "Build #42 succeeded on main.\n\n✓ dock magnification\n✓ window manager\n✓ terminal easter eggs\n\nDeployed to: your imagination" },
  { from: "Figma", subj: "Rohan left a comment on 'macOS clone'", time: "Yesterday", unread: false,
    body: "\"The traffic lights need to be exactly 12px. Trust me on this.\"\n\nReply in Figma →" },
  { from: "Anthropic", subj: "Claude built something for you", time: "Yesterday", unread: false,
    body: "Hi Ayush,\n\nAn entire desktop operating system UI, in three JavaScript files, with a working terminal and a music player that synthesises audio from scratch.\n\nEnjoy,\nClaude 🤖" },
  { from: "People Ops", subj: "Friday: Team lunch 🍕", time: "Tuesday", unread: false,
    body: "Team,\n\nPizza Friday is back. 1 PM, usual place.\n\nPS: whoever keeps booking the meeting room for 'debugging' — we can see the FIFA scores." },
];

function renderMail(body, win) {
  body.innerHTML = `
    <div class="app-split">
      <div class="app-sidebar" style="width:170px">
        <div class="sb-section">Mailboxes</div>
        <div class="sb-row active"><span class="sb-ic">📥</span>Inbox <span style="margin-left:auto;font-size:11px;color:var(--text-ter)" data-role="count"></span></div>
        <div class="sb-row"><span class="sb-ic">📤</span>Sent</div>
        <div class="sb-row"><span class="sb-ic">📝</span>Drafts</div>
        <div class="sb-row"><span class="sb-ic">🗑</span>Bin</div>
      </div>
      <div class="mail-list" data-role="list"></div>
      <div class="mail-read mail-empty" data-role="read">No Message Selected</div>
    </div>`;
  win.addDragHandle($(".app-sidebar", body));

  const list = $("[data-role=list]", body);
  const read = $("[data-role=read]", body);
  let sel = -1;

  function draw() {
    $("[data-role=count]", body).textContent = MAILS.filter((m) => m.unread).length || "";
    list.innerHTML = "";
    MAILS.forEach((m, i) => {
      const cell = el(`<div class="mail-cell ${m.unread ? "unread" : ""} ${i === sel ? "active" : ""}">
          <div class="m-from">${esc(m.from)} <span style="float:right;font-weight:400;font-size:11px;color:var(--text-ter)">${m.time}</span></div>
          <div class="m-subj">${esc(m.subj)}</div>
          <div class="m-snip">${esc(m.body.split("\n")[0])}</div>
        </div>`);
      cell.addEventListener("click", () => {
        sel = i; m.unread = false; draw();
        read.classList.remove("mail-empty");
        read.innerHTML = `<div class="mr-subj">${esc(m.subj)}</div>
          <div class="mr-meta"><b>${esc(m.from)}</b> — to me · ${m.time}</div>
          <div class="mr-body">${esc(m.body)}</div>`;
      });
      list.appendChild(cell);
    });
  }
  draw();
}

/* ═══════════════════ SYSTEM SETTINGS ═══════════════════ */
const ACCENTS = ["#0a84ff", "#bf5af2", "#ff375f", "#ff453a", "#ff9f0a", "#ffd60a", "#32d74b", "#8e8e93"];

function renderSettings(body, win, payload) {
  const panes = [
    { id: "appearance", ic: "🎨", name: "Appearance" },
    { id: "wallpaper", ic: "🖼", name: "Wallpaper" },
    { id: "dock", ic: "⬜", name: "Desktop & Dock" },
    { id: "about", ic: "💻", name: "About" },
  ];
  body.innerHTML = `
    <div class="app-split">
      <div class="app-sidebar" style="width:185px">
        <div style="display:flex;align-items:center;gap:9px;padding:4px 10px 14px">
          <div class="lock-avatar" style="width:38px;height:38px;font-size:15px;box-shadow:none">AK</div>
          <div><div style="font-size:13px;font-weight:700">${esc(State.userName)}</div><div style="font-size:11px;color:var(--text-sec)">Apple Account</div></div>
        </div>
        ${panes.map((p) => `<div class="sb-row" data-pane="${p.id}"><span class="sb-ic">${p.ic}</span>${p.name}</div>`).join("")}
      </div>
      <div class="settings-pane" data-role="pane"></div>
    </div>`;
  win.addDragHandle($(".app-sidebar", body));

  const paneEl = $("[data-role=pane]", body);

  function show(id) {
    $$(".sb-row[data-pane]", body).forEach((r) => r.classList.toggle("active", r.dataset.pane === id));
    if (id === "appearance") {
      paneEl.innerHTML = `
        <h2>Appearance</h2>
        <div class="set-group">
          <div class="set-row"><div><div class="sr-label">Appearance</div><div class="sr-sub">Light or dark, instantly — everywhere.</div></div>
            <div class="seg"><button data-mode="light" class="${!State.dark ? "active" : ""}">Light</button><button data-mode="dark" class="${State.dark ? "active" : ""}">Dark</button></div></div>
          <div class="set-row"><div class="sr-label">Accent colour</div>
            <div class="accent-row">${ACCENTS.map((c) => `<div class="accent-dot ${State.accent === c ? "active" : ""}" data-c="${c}" style="background:${c}"></div>`).join("")}</div></div>
        </div>`;
      $$("[data-mode]", paneEl).forEach((b) => b.addEventListener("click", () => { applyTheme(b.dataset.mode === "dark"); show("appearance"); }));
      $$(".accent-dot", paneEl).forEach((d) => d.addEventListener("click", () => { applyAccent(d.dataset.c); show("appearance"); }));
    } else if (id === "wallpaper") {
      paneEl.innerHTML = `
        <h2>Wallpaper</h2>
        <div class="set-group"><div class="wp-grid">
          ${WALLPAPERS.map((w) => `<div class="wp-thumb ${State.wallpaper === w.id ? "active" : ""}" data-w="${w.id}" style="background:${w.css.replace(/"/g, "&quot;")}"><span>${w.name}</span></div>`).join("")}
        </div></div>`;
      $$(".wp-thumb", paneEl).forEach((t) => t.addEventListener("click", () => { applyWallpaper(t.dataset.w); show("wallpaper"); }));
    } else if (id === "dock") {
      paneEl.innerHTML = `
        <h2>Desktop &amp; Dock</h2>
        <div class="set-group">
          <div class="set-row"><div class="sr-label">Dock size</div><input type="range" class="cc-slider set-slider" data-set="size" min="38" max="72" value="${State.dockSize}"></div>
          <div class="set-row"><div><div class="sr-label">Magnification</div><div class="sr-sub">Icons grow as the pointer approaches.</div></div><div class="switch ${State.magnify ? "on" : ""}" data-set="mag"></div></div>
        </div>`;
      $("[data-set=size]", paneEl).addEventListener("input", (e) => { State.dockSize = +e.target.value; applyDockPrefs(); });
      $("[data-set=mag]", paneEl).addEventListener("click", (e) => { State.magnify = !State.magnify; e.target.classList.toggle("on", State.magnify); applyDockPrefs(); });
    } else if (id === "about") {
      paneEl.innerHTML = `
        <h2>About</h2>
        <div class="set-group" style="padding:18px">
          <div class="about-hero">
            <div class="about-laptop"></div>
            <h3>MacBook Pro</h3>
            <div class="ab-sub">Web Edition, 2026</div>
          </div>
          <div class="set-row"><span class="sr-label">Chip</span><span style="color:var(--text-sec)">Claude F5 (Fable)</span></div>
          <div class="set-row"><span class="sr-label">Memory</span><span style="color:var(--text-sec)">Pure imagination</span></div>
          <div class="set-row"><span class="sr-label">macOS</span><span style="color:var(--text-sec)">Sequoia Web 1.0</span></div>
          <div class="set-row"><span class="sr-label">Serial</span><span style="color:var(--text-sec)">CLAUDE-FABLE-5</span></div>
          <div class="set-row"><span class="sr-label">Software Update</span><button class="dlg-btn" data-act="update" style="padding:4px 12px">Check for Updates</button></div>
        </div>`;
      $("[data-act=update]", paneEl).addEventListener("click", () =>
        setTimeout(() => Notify.push({ title: "Software Update", body: "macOS Web is up to date — version 1.0 is the newest (and only) version.", icon: "settings" }), 800));
    }
  }

  $$(".sb-row[data-pane]", body).forEach((r) => r.addEventListener("click", () => show(r.dataset.pane)));
  show(payload && payload.pane ? payload.pane : "appearance");
}

/* ═══════════════════ ABOUT THIS MAC ═══════════════════ */
function renderAbout(body, win) {
  body.innerHTML = `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 24px;gap:4px;text-align:center">
      <div class="about-laptop" style="width:130px;height:84px"></div>
      <h3 style="margin-top:26px;font-size:20px;font-weight:800;color:var(--text)">MacBook Pro</h3>
      <div style="font-size:12px;color:var(--text-sec);margin-bottom:14px">Web Edition, June 2026</div>
      <div style="font-size:12.5px;color:var(--text-sec);line-height:1.9">
        <b style="color:var(--text)">Chip</b> Claude F5 (Fable)<br>
        <b style="color:var(--text)">Memory</b> Pure imagination<br>
        <b style="color:var(--text)">macOS</b> Sequoia Web 1.0
      </div>
      <button class="dlg-btn" style="margin-top:16px;padding:5px 16px" data-act="more">More Info…</button>
    </div>`;
  win.addDragHandle(body.firstElementChild);
  $("[data-act=more]", body).addEventListener("click", () => WM.open("settings", { pane: "about" }));
}

/* ═══════════════════ TEXTEDIT / PREVIEW / TRASH ═══════════════════ */
function renderTextEdit(body, win, payload) {
  const name = payload ? payload.name : "Untitled.txt";
  win.setTitle(name);
  body.innerHTML = `<div class="app-main" style="width:100%"><div class="textedit-area" contenteditable="true" spellcheck="false"></div></div>`;
  $(".textedit-area", body).innerText = payload ? payload.content : "";
}

function renderPreview(body, win, payload) {
  win.setTitle(payload ? payload.name : "Preview");
  body.innerHTML = `<div class="preview-body"><div class="preview-img" style="background:${payload ? payload.css : "#444"}"></div></div>`;
}

function renderTrash(body, win) {
  const items = TrashBin.items;
  body.innerHTML = `
    <div class="app-main trash-body" style="width:100%">
      <div class="app-toolbar">
        <span class="tb-title">Trash</span>
        <span class="tb-spacer"></span>
        <span class="trash-toolbar-note">${items.length} item${items.length === 1 ? "" : "s"}</span>
        <button class="dlg-btn" data-act="empty" style="padding:4px 12px">Empty…</button>
      </div>
      ${items.length
        ? `<div class="finder-grid">${items.map((it) => `<div class="f-item"><div class="fi-icon">${makeIcon(it.icon || "textedit")}</div><div class="fi-name">${esc(it.name)}</div></div>`).join("")}</div>`
        : `<div class="trash-empty-state">${makeIcon("trash")}<span>Trash is Empty</span></div>`}
    </div>`;
  $("[data-act=empty]", body).addEventListener("click", () => TrashBin.confirmEmpty());
}

/* ═══════════════════ APP REGISTRY ═══════════════════ */
const APPS = {
  finder: { id: "finder", name: "Finder", icon: "finder", width: 880, height: 540, minW: 560, minH: 340, seamless: true, render: renderFinder,
    about: "The macOS file manager — browse the demo filesystem.",
    menuPatch: { File: [{ label: "New Finder Window", shortcut: "⌘N", action: () => WM.open("finder") }] } },
  launchpad: { id: "launchpad", name: "Launchpad", icon: "launchpad", launchpad: false, about: "All your apps in a grid." },
  safari: { id: "safari", name: "Safari", icon: "safari", width: 1000, height: 650, minW: 520, minH: 360, seamless: true, sidebar: false, render: renderSafari,
    about: "Browse the real web — inside a fake Mac." },
  messages: { id: "messages", name: "Messages", icon: "messages", width: 740, height: 520, minW: 540, minH: 380, seamless: true, render: renderMessages,
    about: "Chat with (slightly artificial) friends. They reply!" },
  mail: { id: "mail", name: "Mail", icon: "mail", width: 920, height: 560, minW: 700, minH: 400, seamless: true, render: renderMail,
    about: "Inbox zero is finally achievable — there are only five emails." },
  photos: { id: "photos", name: "Photos", icon: "photos", width: 880, height: 560, minW: 520, minH: 380, render: renderPhotos,
    about: "A library of generated gradients. Very abstract. Very artistic." },
  notes: { id: "notes", name: "Notes", icon: "notes", width: 840, height: 540, minW: 600, minH: 380, render: (b, w) => NotesApp.render(b, w),
    about: "Real notes, saved in your browser.",
    menuPatch: { File: [{ label: "New Note", shortcut: "⌘N", action: () => NotesApp.create() }] } },
  calendar: { id: "calendar", name: "Calendar", icon: "calendar", width: 780, height: 560, minW: 560, minH: 420, render: renderCalendarApp,
    about: "Today is highlighted. Demo Day is coming." },
  music: { id: "music", name: "Music", icon: "music", width: 880, height: 560, minW: 640, minH: 420, seamless: true, render: renderMusic,
    about: "Generative synth tracks, composed live by the Web Audio API.",
    onClose: () => MusicPlayer.pause() },
  calculator: { id: "calculator", name: "Calculator", icon: "calculator", width: 240, height: 354, minW: 240, minH: 354, seamless: true, sidebar: false, render: renderCalculator,
    about: "It calculates. Keyboard works too." },
  terminal: { id: "terminal", name: "Terminal", icon: "terminal", width: 660, height: 430, minW: 420, minH: 280, render: renderTerminal,
    about: "A real-feeling zsh cosplay. Try `neofetch`, `say hello`, or `sudo rm -rf /`." },
  settings: { id: "settings", name: "System Settings", icon: "settings", width: 800, height: 560, minW: 640, minH: 420, seamless: true, render: renderSettings,
    about: "Wallpapers, appearance, accent colours, dock physics." },
  trash: { id: "trash", name: "Trash", icon: "trash", width: 620, height: 420, minW: 420, minH: 300, launchpad: false, spotlight: false, render: renderTrash,
    about: "Where deleted things go to be dramatic." },
  about: { id: "about", name: "About This Mac", icon: "finder", width: 300, height: 440, minW: 300, minH: 440, seamless: true, sidebar: false, launchpad: false, render: renderAbout },
  textedit: { id: "textedit", name: "TextEdit", icon: "textedit", width: 660, height: 480, minW: 400, minH: 300, launchpad: false, spotlight: false, render: renderTextEdit },
  preview: { id: "preview", name: "Preview", icon: "preview", width: 720, height: 520, minW: 400, minH: 300, launchpad: false, spotlight: false, render: renderPreview },
};
