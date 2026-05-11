import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor-Wrapper für die MasterMind-PWA.
 *
 * Production: `webDir` zeigt auf den Next.js Static-Export oder einen
 * separat gehosteten Build. Für eine PWA-Wrapper-Strategie ist der
 * empfohlene Pfad:
 *
 * 1. Next.js auf einer eigenen Domain hosten (z. B. app.mastermind.app)
 * 2. `server.url` unten auf diese Domain zeigen lassen — Capacitor
 *    rendert dann die Live-Website in einem WebView
 * 3. Native-Plugins (Push, Camera, Biometrie) über Capacitor-APIs einbinden
 *
 * Alternative (Static-Export): `next.config.ts` auf `output: "export"`
 * setzen, `next build` führt zu `out/`-Ordner, dann hier `webDir: "out"`
 * konfigurieren — aber Server Actions, Route Handlers und Streaming
 * funktionieren in dem Setup nicht.
 */
const config: CapacitorConfig = {
  appId: "app.mastermind.client",
  appName: "MasterMind",
  webDir: "out",

  // Wenn die App das gehostete Web-Frontend lädt:
  // server: {
  //   url: "https://app.mastermind.app",
  //   cleartext: false,
  // },

  ios: {
    contentInset: "automatic",
    backgroundColor: "#0d1117",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0d1117",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#0d1117",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0d1117",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
