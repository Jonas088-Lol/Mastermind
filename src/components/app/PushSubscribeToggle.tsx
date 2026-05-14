"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

type PushState = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray.buffer as ArrayBuffer;
}

export function PushSubscribeToggle() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setState(sub ? "subscribed" : "unsubscribed");
      });
    });
    if (Notification.permission === "denied") setState("denied");
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("denied"); return; }

      const res = await fetch("/api/push/subscribe");
      const { publicKey } = await res.json();
      if (!publicKey) { setState("unsupported"); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setState("subscribed");
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex items-center gap-3 px-1 py-2 text-sm text-muted-fg">
        <Loader2 className="size-4 animate-spin" />
        Push-Status wird geladen…
      </div>
    );
  }

  if (state === "unsupported") {
    return (
      <p className="px-1 py-2 text-xs text-muted-fg">
        Push-Benachrichtigungen werden in diesem Browser nicht unterstützt.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="px-1 py-2 text-xs text-muted-fg">
        Push-Benachrichtigungen wurden blockiert. Bitte in den Browser-Einstellungen erlauben.
      </p>
    );
  }

  const isSubscribed = state === "subscribed";

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <Bell className="size-4 text-success" strokeWidth={1.75} />
        ) : (
          <BellOff className="size-4 text-muted-fg" strokeWidth={1.75} />
        )}
        <div>
          <p className="text-sm font-semibold">
            {isSubscribed ? "Push aktiv" : "Push deaktiviert"}
          </p>
          <p className="text-xs text-muted-fg">
            {isSubscribed
              ? "Du erhältst Benachrichtigungen auf diesem Gerät."
              : "Aktiviere Push, um Benachrichtigungen zu erhalten."}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={isSubscribed ? unsubscribe : subscribe}
        className={`shrink-0 px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
          isSubscribed
            ? "border border-border bg-bg text-muted-fg hover:bg-danger/10 hover:text-danger hover:border-danger/30"
            : "bg-fg text-bg hover:bg-fg/90"
        }`}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : isSubscribed ? "Deaktivieren" : "Aktivieren"}
      </button>
    </div>
  );
}
