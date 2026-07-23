/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { DokumentEditorView } from "@/components/office/DokumentEditorView";

export const metadata: Metadata = { title: "MasterDoc · MasterOffice" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DokumentEditorView params={params} />;
}
