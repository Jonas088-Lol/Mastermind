/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { DokumenteView } from "@/components/office/DokumenteView";

export const metadata: Metadata = { title: "MasterDoc · MasterOffice" };

export default function Page() {
  return <DokumenteView basePath="/sekretariat/office" />;
}
