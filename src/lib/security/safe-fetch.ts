/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * SSRF-Schutz für serverseitige Fetches auf potenziell nutzergesteuerte URLs.
 *
 * Aktuell fetcht MasterMind serverseitig NUR feste, vertrauenswürdige Hosts
 * (Anthropic, Resend) — es gibt derzeit keine SSRF-Fläche. Dieses Utility ist
 * die Absicherung für künftige Fälle (Bild-Proxy, Webhook-Validierung, o.ä.):
 * jeder Fetch auf eine URL, die aus Nutzereingaben/DB stammt, MUSS hierüber
 * laufen.
 *
 * Blockiert: nicht-http(s)-Schemata, interne/private/link-local IP-Ranges,
 * localhost, Cloud-Metadata-Endpoints (169.254.169.254).
 *
 * Grenze: DNS-Rebinding ist damit nicht vollständig ausgeschlossen (die
 * Auflösung kann sich zwischen Check und Request ändern). Für harte Fälle
 * zusätzlich auf Netzwerkebene absichern (egress-Firewall).
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
]);

// Private / reservierte IPv4-Bereiche + Metadata
function isBlockedIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 10) return true;                      // 10.0.0.0/8
  if (a === 127) return true;                     // Loopback
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true;        // 192.168.0.0/16
  if (a === 169 && b === 254) return true;        // Link-local + Cloud-Metadata
  if (a === 0) return true;                       // 0.0.0.0/8
  if (a >= 224) return true;                      // Multicast/reserved
  return false;
}

function isBlockedIPv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    h === "::1" ||          // Loopback
    h.startsWith("fe80") || // Link-local
    h.startsWith("fc") ||   // Unique-local
    h.startsWith("fd") ||
    h === "::" ||
    h.startsWith("::ffff:") // IPv4-mapped → könnte interne v4 verbergen
  );
}

/** Prüft, ob eine URL sicher (öffentlich, http/https) angefragt werden darf. */
export function isSafePublicUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return false;

  // Literale IPs prüfen
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return !isBlockedIPv4(host);
  if (host.includes(":") || host.startsWith("[")) return !isBlockedIPv6(host);

  // Hostname (kein Literal): .local / interne TLDs blocken
  if (host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) return false;

  return true;
}

/**
 * fetch() mit SSRF-Guard. Wirft, wenn die URL nicht öffentlich/erlaubt ist.
 * Optionale Host-Allowlist für maximale Strenge.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit & { allowedHosts?: string[] }
): Promise<Response> {
  if (!isSafePublicUrl(url)) {
    throw new Error(`safeFetch: URL blockiert (SSRF-Schutz): ${url}`);
  }
  if (init?.allowedHosts) {
    const host = new URL(url).hostname.toLowerCase();
    if (!init.allowedHosts.includes(host)) {
      throw new Error(`safeFetch: Host nicht in Allowlist: ${host}`);
    }
  }
  // Redirects nicht automatisch folgen — sonst kann ein 302 auf interne IPs zeigen.
  const { allowedHosts: _a, ...rest } = init ?? {};
  return fetch(url, { redirect: "manual", ...rest });
}
