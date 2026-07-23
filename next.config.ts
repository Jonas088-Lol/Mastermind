/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const securityHeaders: { key: string; value: string }[] = [
  // Content-Security-Policy wird in src/proxy.ts gesetzt (per-Request-Nonce-fähig).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // camera/microphone auf "self": MasterSpace nutzt getUserMedia für Sprach- und
  // Videoanrufe. Mit camera=()/microphone=() blockt der Browser das komplett
  // ("Permissions policy violation"). Fremde Einbettungen bleiben ausgeschlossen.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), interest-cohort=()",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  // Standalone output creates a self-contained bundle — no full node_modules needed
  // in production. Results in ~70% smaller Docker images.
  output: "standalone",
  // Build-Maschine ist langsam und die DB ist beim Bauen nicht erreichbar —
  // der Default von 60s pro Seite reicht nicht, wodurch selbst statische Seiten
  // (z. B. /_not-found) nach 3 Versuchen aufgeben. 5 Minuten geben Luft.
  staticPageGenerationTimeout: 300,
  async headers() {
    return [
      {
        // Alles außer Service-Worker und Manifest (die bekommen separate Caches)
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
