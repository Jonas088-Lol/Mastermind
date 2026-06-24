/**
 * MasterMind Desktop App — Electron Main Process
 *
 * Architecture: "Server-First" thin client.
 * The Electron window loads the production server URL.
 * All app logic runs server-side — no local bundling needed.
 * Updates are instant because the server serves the latest code.
 */

const { app, BrowserWindow, shell, Menu, Tray, nativeImage, ipcMain, session } = require("electron");
const path = require("path");
const os = require("os");

// ── Config ────────────────────────────────────────────────────────────────────

const SERVER_URL = process.env.MASTERMIND_SERVER_URL || "https://app.mastermind.app";
const APP_NAME = "MasterMind";
const APP_VERSION = app.getVersion();
const IS_MAC = process.platform === "darwin";
const IS_WIN = process.platform === "win32";

// ── Window management ─────────────────────────────────────────────────────────

let mainWindow = null;
let tray = null;

function createWindow() {
  const iconPath = path.join(__dirname, "resources", IS_WIN ? "icon.ico" : IS_MAC ? "icon.icns" : "icon.png");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: APP_NAME,
    icon: iconPath,
    backgroundColor: "#0d1117",
    titleBarStyle: IS_MAC ? "hiddenInset" : "default",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
      // Security: restrict navigation to server origin only
      webviewTag: false,
      allowRunningInsecureContent: false,
    },
    show: false,
  });

  // ── Load server ──
  mainWindow.loadURL(SERVER_URL, {
    userAgent: `MasterMindApp/${APP_VERSION} Electron/${process.versions.electron} ${os.platform()}/${os.release()}`,
  });

  // ── Show when ready ──
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (process.platform === "win32") {
      mainWindow.flashFrame(false);
    }
  });

  // ── Loading screen ──
  mainWindow.webContents.on("did-start-loading", () => {
    mainWindow.webContents.insertCSS(`
      #mm-loading {
        position: fixed; inset: 0; z-index: 99999;
        background: #0d1117;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 20px; font-family: -apple-system, sans-serif;
        color: #e6edf3;
        transition: opacity 0.3s ease;
      }
      #mm-loading.hidden { opacity: 0; pointer-events: none; }
      .mm-spinner {
        width: 40px; height: 40px;
        border: 3px solid rgba(99,102,241,0.2);
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `);
  });

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.executeJavaScript(`
      const el = document.getElementById('mm-loading');
      if (el) { el.classList.add('hidden'); setTimeout(() => el.remove(), 400); }
    `).catch(() => {});
  });

  // ── Open external links in default browser ──
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(SERVER_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // ── Block navigation away from server ──
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowed = [SERVER_URL, "https://app.mastermind.app"].some(
      (base) => url.startsWith(base)
    );
    if (!allowed) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── App menu ──────────────────────────────────────────────────────────────────

function buildMenu() {
  const template = [
    ...(IS_MAC
      ? [
          {
            label: APP_NAME,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "Datei",
      submenu: [
        {
          label: "Neu laden",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow?.reload(),
        },
        { type: "separator" },
        IS_MAC ? { role: "close" } : { role: "quit", label: "Beenden" },
      ],
    },
    {
      label: "Ansicht",
      submenu: [
        {
          label: "Vergrößern",
          accelerator: "CmdOrCtrl+Plus",
          click: () => {
            if (!mainWindow) return;
            const z = mainWindow.webContents.getZoomFactor();
            mainWindow.webContents.setZoomFactor(Math.min(z + 0.1, 2.5));
          },
        },
        {
          label: "Verkleinern",
          accelerator: "CmdOrCtrl+-",
          click: () => {
            if (!mainWindow) return;
            const z = mainWindow.webContents.getZoomFactor();
            mainWindow.webContents.setZoomFactor(Math.max(z - 0.1, 0.5));
          },
        },
        {
          label: "Normalgröße",
          accelerator: "CmdOrCtrl+0",
          click: () => mainWindow?.webContents.setZoomFactor(1),
        },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Fenster",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(IS_MAC
          ? [{ type: "separator" }, { role: "front" }]
          : [{ role: "close" }]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── System tray (Windows/Linux) ───────────────────────────────────────────────

function createTray() {
  if (IS_MAC) return; // Mac uses dock instead
  const iconPath = path.join(__dirname, "resources", "icon.png");
  tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
  tray.setToolTip(APP_NAME);
  const ctxMenu = Menu.buildFromTemplate([
    { label: "MasterMind öffnen", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: "separator" },
    { label: "Beenden", role: "quit" },
  ]);
  tray.setContextMenu(ctxMenu);
  tray.on("click", () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ── Security: content-security tweaks ────────────────────────────────────────

function configureSession() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "X-Frame-Options": ["DENY"],
        "X-Content-Type-Options": ["nosniff"],
      },
    });
  });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  configureSession();
  createWindow();
  buildMenu();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (!IS_MAC) app.quit();
});

// ── IPC ───────────────────────────────────────────────────────────────────────

ipcMain.handle("app-version", () => APP_VERSION);
ipcMain.handle("open-external", (_, url) => shell.openExternal(url));
