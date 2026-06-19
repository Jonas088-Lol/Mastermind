import type { Metadata } from "next";
import { DownloadPageClient } from "./DownloadPageClient";

export const metadata: Metadata = {
  title: "App herunterladen · MasterMind",
  description: "Lade die MasterMind-App für Android herunter und installiere sie in wenigen Schritten.",
};

// APK URL: lege die fertige APK unter public/downloads/mastermind.apk ab
// oder setze NEXT_PUBLIC_APK_URL auf eine externe URL.
const APK_URL = process.env.NEXT_PUBLIC_APK_URL ?? "/downloads/mastermind.apk";
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0";

export default function DownloadPage() {
  return <DownloadPageClient apkUrl={APK_URL} appVersion={APP_VERSION} />;
}
