/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Native plugin wrapper.
 *
 * All Capacitor calls are guarded with isNative() so the same code
 * runs safely in the browser (where plugins are no-ops).
 *
 * Usage:
 *   import { native, isNative } from "@/lib/native";
 *   await native.haptics.impact();
 */

// ── Platform detection ─────────────────────────────────────────────────────

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.();
}

export function getPlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.();
  if (p === "ios") return "ios";
  if (p === "android") return "android";
  return "web";
}

// ── Lazy plugin imports (only load on native) ──────────────────────────────

async function hapticImpact(style: "Heavy" | "Medium" | "Light" = "Medium") {
  if (!isNative()) return;
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  await Haptics.impact({ style: ImpactStyle[style] });
}

async function hapticNotification(type: "Success" | "Warning" | "Error" = "Success") {
  if (!isNative()) return;
  const { Haptics, NotificationType } = await import("@capacitor/haptics");
  await Haptics.notification({ type: NotificationType[type] });
}

async function hapticVibrate(duration = 300) {
  if (!isNative()) return;
  const { Haptics } = await import("@capacitor/haptics");
  await Haptics.vibrate({ duration });
}

async function hideSplash() {
  if (!isNative()) return;
  const { SplashScreen } = await import("@capacitor/splash-screen");
  await SplashScreen.hide({ fadeOutDuration: 200 });
}

async function setStatusBarStyle(style: "Dark" | "Light", color?: string) {
  if (!isNative()) return;
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  await StatusBar.setStyle({ style: Style[style] });
  if (color && getPlatform() === "android") {
    await StatusBar.setBackgroundColor({ color });
  }
}

async function setKeyboardMode(mode: "Body" | "Ionic" | "Native" | "None") {
  if (!isNative()) return;
  const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
  await Keyboard.setResizeMode({ mode: KeyboardResize[mode] });
}

async function hideKeyboard() {
  if (!isNative()) return;
  const { Keyboard } = await import("@capacitor/keyboard");
  await Keyboard.hide();
}

async function getNetworkStatus() {
  if (!isNative()) return { connected: navigator.onLine, connectionType: "unknown" as const };
  const { Network } = await import("@capacitor/network");
  return Network.getStatus();
}

async function shareContent(options: { title: string; text?: string; url?: string }) {
  if (!isNative()) {
    if (navigator.share) {
      await navigator.share(options);
    }
    return;
  }
  const { Share } = await import("@capacitor/share");
  await Share.share(options);
}

async function openBrowser(url: string) {
  if (!isNative()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url, presentationStyle: "popover" });
}

async function setPreference(key: string, value: string) {
  if (!isNative()) {
    localStorage.setItem(`cap_${key}`, value);
    return;
  }
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key, value });
}

async function getPreference(key: string): Promise<string | null> {
  if (!isNative()) return localStorage.getItem(`cap_${key}`);
  const { Preferences } = await import("@capacitor/preferences");
  const { value } = await Preferences.get({ key });
  return value;
}

async function takePicture(): Promise<string | null> {
  if (!isNative()) return null;
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      quality: 80,
      width: 1024,
    });
    return photo.dataUrl ?? null;
  } catch {
    return null;
  }
}

async function pickFromGallery(): Promise<string | null> {
  if (!isNative()) return null;
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      quality: 80,
      width: 1024,
    });
    return photo.dataUrl ?? null;
  } catch {
    return null;
  }
}

// Register for native push (FCM on Android, APNs on iOS) and return the device token.
// Returns null on web or if the user denies permission.
async function registerPushNotifications(
  onNotification: (data: Record<string, unknown>) => void
): Promise<string | null> {
  if (!isNative()) return null;
  const { PushNotifications } = await import("@capacitor/push-notifications");

  // Ask for permission (no-op if already granted).
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") return null;

  // Deliver foreground notifications to the caller.
  await PushNotifications.addListener("pushNotificationReceived", (notif) => {
    onNotification({ ...notif.data, title: notif.title, body: notif.body });
  });
  // When the user taps a notification, navigate to its url if provided.
  await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const url = action.notification.data?.url;
    if (typeof url === "string" && url.startsWith("/")) {
      window.location.href = url;
    }
  });

  // The token arrives asynchronously via the "registration" event.
  return new Promise<string | null>((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    PushNotifications.addListener("registration", (token) => finish(token.value));
    PushNotifications.addListener("registrationError", () => finish(null));
    PushNotifications.register().catch(() => finish(null));
    // Safety timeout so init() never hangs if the platform is silent.
    setTimeout(() => finish(null), 10000);
  });
}

// Listen for app state changes (background/foreground)
async function onAppStateChange(cb: (isActive: boolean) => void) {
  if (!isNative()) return;
  const { App } = await import("@capacitor/app");
  App.addListener("appStateChange", ({ isActive }) => cb(isActive));
}

// Handle Android back button
async function onBackButton(cb: () => void) {
  if (getPlatform() !== "android") return;
  const { App } = await import("@capacitor/app");
  App.addListener("backButton", cb);
}

// ── Exported namespace ─────────────────────────────────────────────────────

export const native = {
  haptics: {
    impact: hapticImpact,
    notification: hapticNotification,
    vibrate: hapticVibrate,
  },
  splash: { hide: hideSplash },
  statusBar: { setStyle: setStatusBarStyle },
  keyboard: { setMode: setKeyboardMode, hide: hideKeyboard },
  network: { getStatus: getNetworkStatus },
  share: shareContent,
  browser: { open: openBrowser },
  preferences: { set: setPreference, get: getPreference },
  camera: { take: takePicture, gallery: pickFromGallery },
  push: { register: registerPushNotifications },
  app: { onStateChange: onAppStateChange, onBack: onBackButton },
};
