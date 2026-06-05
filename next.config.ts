import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * CSP — bewusst restriktiv. Inline-Styles erlauben wir, weil Tailwind in der
 * Output-Form CSS-Variablen via style-Attribut belegt und next-themes auf
 * data-Attribute zugreift. `unsafe-inline` für Scripts ist nur in dev nötig
 * (Turbopack). In prod blocken wir es.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self'" + (isProd ? "" : " 'unsafe-eval' 'unsafe-inline'"),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Anthropic API + Resend
  "connect-src 'self' https://api.anthropic.com https://api.resend.com",
  // YouTube embeds for exercise video lessons
  "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders: { key: string; value: string }[] = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
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
  // Standalone output creates a self-contained bundle — no full node_modules needed
  // in production. Results in ~70% smaller Docker images.
  output: "standalone",
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
