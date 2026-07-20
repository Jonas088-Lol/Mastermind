/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { TabellenView } from "@/components/office/TabellenView";

export const metadata: Metadata = { title: "Tabellen · MasterOffice" };

export default function Page() {
  return <TabellenView basePath="/rektor/office" />;
}
