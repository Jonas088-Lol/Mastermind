import { ImageResponse } from "next/og";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// iOS splash screen generator
// Usage: /api/splash?w=1170&h=2532
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const w = Math.min(2732, Math.max(320, parseInt(searchParams.get("w") ?? "1170", 10)));
  const h = Math.min(2732, Math.max(320, parseInt(searchParams.get("h") ?? "2532", 10)));

  const candidates = [
    join(process.cwd(), "public/mastermind-logo.png"),
    join(process.cwd(), "public/brand/icon.png"),
  ];

  let logoData: string | null = null;
  for (const p of candidates) {
    if (existsSync(p)) {
      logoData = `data:image/png;base64,${readFileSync(p).toString("base64")}`;
      break;
    }
  }

  const logoSize = Math.round(Math.min(w, h) * 0.25);

  const res = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "hsl(222, 24%, 7%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: Math.round(logoSize * 0.18),
        }}
      >
        {logoData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoData}
            alt="MasterMind"
            style={{
              width: logoSize,
              height: logoSize,
              borderRadius: Math.round(logoSize * 0.22),
            }}
          />
        ) : (
          <div
            style={{
              width: logoSize,
              height: logoSize,
              background: "hsl(232, 90%, 64%)",
              borderRadius: Math.round(logoSize * 0.22),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: Math.round(logoSize * 0.45),
              fontWeight: 900,
              fontFamily: "sans-serif",
            }}
          >
            MM
          </div>
        )}
        <div
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: Math.round(logoSize * 0.13),
            fontWeight: 700,
            fontFamily: "sans-serif",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          MasterMind
        </div>
      </div>
    ),
    { width: w, height: h }
  );

  return new Response(res.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
