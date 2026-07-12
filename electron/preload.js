/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Preload script — runs in the renderer before page scripts.
 * Exposes a minimal safe bridge (contextBridge) for IPC.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => ipcRenderer.invoke("app-version"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  platform: process.platform,
});
