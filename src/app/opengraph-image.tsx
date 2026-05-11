import { ImageResponse } from "next/og";

export const alt = "MasterMind — Eine Plattform für Schule";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "hsl(222, 24%, 7%)",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          fontFamily: "sans-serif",
          color: "hsl(210, 16%, 96%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "linear-gradient(to right, hsl(222, 14%, 18%) 1px, transparent 1px), linear-gradient(to bottom, hsl(222, 14%, 18%) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            opacity: 0.4,
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "hsl(210, 16%, 96%)",
              color: "hsl(222, 24%, 7%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: -1,
            }}
          >
            MM
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            MasterMind
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 4,
              color: "hsl(232, 90%, 64%)",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Eine Plattform für Schule
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              letterSpacing: -2.5,
              lineHeight: 1.05,
              maxWidth: 1000,
              display: "flex",
            }}
          >
            Lernen, Verwaltung und KI in einer Plattform.
          </div>
          <div
            style={{
              fontSize: 24,
              color: "hsl(220, 9%, 64%)",
              display: "flex",
              gap: 24,
            }}
          >
            <span>DSGVO-konform</span>
            <span>·</span>
            <span>Hosting Frankfurt</span>
            <span>·</span>
            <span>30-Min-Onboarding</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
