import type { CapacitorConfig } from "@capacitor/cli";

const PROD_URL = process.env.CAPACITOR_APP_URL ?? "https://app.mastermind.app";

const config: CapacitorConfig = {
  appId: "app.mastermind.client",
  appName: "MasterMind",
  webDir: "out",
  server: {
    url: PROD_URL,
    cleartext: false,
    androidScheme: "https",
    hostname: "app.mastermind.app",
    allowNavigation: ["mastermind.app", "*.mastermind.app"],
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#0d1117",
    scrollEnabled: true,
    allowsLinkPreview: false,
    handleApplicationNotifications: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0d1117",
    captureInput: true,
    webContentsDebuggingEnabled: false,
    appendUserAgent: "MasterMindApp/1.0",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: "#0d1117",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      spinnerColor: "#6366f1",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0d1117",
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
