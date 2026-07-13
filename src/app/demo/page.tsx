/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { DemoClient } from "./DemoClient";

export const metadata: Metadata = { title: "Demo starten · MasterMind" };
export const dynamic = "force-dynamic";

export default function DemoPage() {
  return <DemoClient />;
}
