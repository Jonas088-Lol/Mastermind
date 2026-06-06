import { ImageResponse } from "next/og";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";
// Node.js runtime so we can read files from disk
export const runtime = "nodejs";

export default function Icon() {
  // If a custom icon was dropped into public/brand/icon.png, serve it directly
  const brandIconPath = join(process.cwd(), "public/brand/icon.png");
  if (existsSync(brandIconPath)) {
    return new Response(readFileSync(brandIconPath), {
      headers: { "Content-Type": "image/png" },
    });
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
