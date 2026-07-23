/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { VaultView } from "@/components/office/VaultView";

export const metadata: Metadata = { title: "MasterVault · MasterOffice" };

export default function Page() {
  return <VaultView />;
}
