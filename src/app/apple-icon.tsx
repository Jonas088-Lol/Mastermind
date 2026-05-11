import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
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
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          MM
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 4,
            color: "hsl(232, 90%, 64%)",
            textTransform: "uppercase",
          }}
        >
          MasterMind
        </div>
      </div>
    ),
    { ...size }
  );
}
