/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { DokumenteView } from "@/components/office/DokumenteView";

export const metadata: Metadata = { title: "MasterDoc · MasterMind" };

export default function Page() {
  return <DokumenteView basePath="/app" />;
}
