/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { TabelleEditorView } from "@/components/office/TabelleEditorView";

export const metadata: Metadata = { title: "MasterCalc · MasterOffice" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <TabelleEditorView params={params} />;
}
