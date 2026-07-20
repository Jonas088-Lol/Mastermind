/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { PraesentationEditorView } from "@/components/office/PraesentationEditorView";

export const metadata: Metadata = { title: "Präsentation · MasterOffice" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <PraesentationEditorView params={params} />;
}
