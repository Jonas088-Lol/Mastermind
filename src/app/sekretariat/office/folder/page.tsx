/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { MasterFolderView } from "@/components/office/MasterFolderView";

export const metadata: Metadata = { title: "MasterFolder · MasterOffice" };

export default function Page() {
  return <MasterFolderView />;
}
