/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { ComingSoonView } from "@/components/office/ComingSoonView";

export const metadata: Metadata = { title: "MasterVault · MasterOffice" };

export default function Page() {
  return <ComingSoonView module="vault" />;
}
