import { ImageResponse } from "next/og";
import { SITE_TAGLINE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Watchruum — Never get spoiled again";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a14",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -160,
            left: -120,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.55), transparent 62%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.5), transparent 62%)",
          }}
        />
        <div style={{ display: "flex", fontSize: 128, fontWeight: 800, letterSpacing: -4 }}>
          <span style={{ color: "#ffffff" }}>Watch</span>
          <span style={{ color: "#8b5cf6" }}>ruum</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 46, fontWeight: 700, color: "#c4b5fd" }}>{`${SITE_TAGLINE}.`}</div>
        <div style={{ marginTop: 14, fontSize: 28, color: "#9aa0b8" }}>Spoiler-safe social TV &amp; film</div>
      </div>
    ),
    { ...size },
  );
}
