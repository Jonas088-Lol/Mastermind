/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { DokumenteView } from "@/components/office/DokumenteView";

export const metadata: Metadata = { title: "Dokumente · MasterOffice" };

export default function Page() {
  return <DokumenteView basePath="/sekretariat/office" />;
}
