/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { PraesentationenView } from "@/components/office/PraesentationenView";

export const metadata: Metadata = { title: "MasterSlides · MasterMind" };

export default function Page() {
  return <PraesentationenView basePath="/app" />;
}
