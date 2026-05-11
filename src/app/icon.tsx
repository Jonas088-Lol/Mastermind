import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
