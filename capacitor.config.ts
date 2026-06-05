import type { CapacitorConfig } from "@capacitor/cli";

// Set CAPACITOR_APP_URL to your server domain, e.g.:
//   CAPACITOR_APP_URL=https://meine-schule.de npx cap sync
const PROD_URL = process.env.CAPACITOR_APP_URL ?? "https://app.mastermind.app";

// Extract hostname from URL so allowNavigation stays consistent
let appHostname = "app.mastermind.app";
try {
  appHostname = new URL(PROD_URL).hostname;
} catch {
  // fallback to default
}
const appDomain = appHostname.split(".").slice(-2).join(".");

const config: CapacitorConfig = {
  appId: "app.mastermind.client",
  appName: "MasterMind",
  // mobile-shell/index.html is the native loading screen shown briefly before
  // the server URL loads. Required by npx cap sync — not bundled as app content.
  webDir: "mobile-shell",
  server: {
    url: PROD_URL,
    cleartext: false,
    androidScheme: "https",
    hostname: appHostname,
    allowNavigation: [appDomain, `*.${appDomain}`],
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
