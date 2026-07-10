import type { Metadata } from "next";
import { DownloadPageClient } from "./DownloadPageClient";

export const metadata: Metadata = {
  title: "App herunterladen · MasterMind",
  description:
    "MasterMind für Android, iOS, Windows, Mac und Linux — eine App, alle Plattformen. Immer aktuell, direkt vom Server.",
};

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://konvertis.de";

export default function DownloadPage() {
  return <DownloadPageClient appVersion={APP_VERSION} baseUrl={BASE_URL} />;
}
