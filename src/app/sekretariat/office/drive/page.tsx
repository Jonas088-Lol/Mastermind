/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { DriveView } from "@/components/office/DriveView";

export const metadata: Metadata = { title: "Drive · MasterOffice" };

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return <DriveView searchParams={searchParams} />;
}
