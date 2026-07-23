/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { buildVaultExport, gzipVault } from "@/lib/vault-export";

/**
 * MasterVault-Export: die eigene Akte als eine gzip-komprimierte JSON-Datei.
 * DSGVO-Selbstauskunft — liefert ausschließlich die Daten des angemeldeten
 * Nutzers. Kein Zugriff auf fremde Akten über diesen Weg.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const nowIso = new Date().toISOString();
  const data = await buildVaultExport(session.userId, nowIso);
  const gz = gzipVault(data);

  const stamp = nowIso.slice(0, 10);
  const filename = `mastervault-${stamp}.json.gz`;

  // Uint8Array aus dem Buffer für eine web-standardkonforme Response.
  return new Response(new Uint8Array(gz), {
    status: 200,
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(gz.length),
      "Cache-Control": "no-store",
    },
  });
}
