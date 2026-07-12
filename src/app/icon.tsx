/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ImageResponse } from "next/og";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";
// Node.js runtime so we can read files from disk
export const runtime = "nodejs";

export default function Icon() {
  // Priority: public/mastermind-logo.png → public/brand/icon.png → generated
  const candidates = [
    join(process.cwd(), "public/mastermind-logo.png"),
    join(process.cwd(), "public/brand/icon.png"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      return new Response(readFileSync(p), { headers: { "Content-Type": "image/png" } });
    }
  }

  // Fallback: generated "MM" icon
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "hsl(222, 24%, 7%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 280,
          fontWeight: 900,
          letterSpacing: -10,
          fontFamily: "sans-serif",
        }}
      >
        MM
      </div>
    ),
    { ...size }
  );
}
