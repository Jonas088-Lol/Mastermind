/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { canUseOffice } from "@/lib/office";
import { MasterFolderClient } from "./MasterFolderClient";

/**
 * MasterFolder (v1): persönlicher Ordner mit Offline-First-Notizen im Browser.
 * Der Guard bleibt serverseitig; die eigentliche Offline-Logik läuft im Client.
 */
export async function MasterFolderView() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canUseOffice(effectiveRole(session))) redirect("/");
  return <MasterFolderClient />;
}
