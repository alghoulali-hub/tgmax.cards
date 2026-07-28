import { ImageResponse } from "next/og";
import { getSharedCard } from "../../../lib/shared-card";

export const alt = "TGMAX trading card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CardOpenGraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getSharedCard(id);

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#17201b", color: "white", padding: 70 }}>
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", gap: 70 }}>
        <div style={{ width: 330, height: 460, display: "flex", alignItems: "center", justifyContent: "center", background: "#27352e", border: "12px solid #d8b54a", borderRadius: 22, overflow: "hidden" }}>
          {card?.imageUrl
            ? <img src={card.imageUrl} alt="" width="330" height="460" style={{ objectFit: "contain" }} />
            : <div style={{ display: "flex", fontSize: 110, fontWeight: 900, color: "#d8ff3e" }}>TG</div>}
        </div>
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          <div style={{ display: "flex", color: "#d8ff3e", fontSize: 26, letterSpacing: 5, textTransform: "uppercase" }}>TGMAX · {card?.category ?? "Trading card"}</div>
          <div style={{ display: "flex", fontSize: 72, lineHeight: 1, fontWeight: 850, marginTop: 28 }}>{card?.title ?? "Trading card"}</div>
          <div style={{ display: "flex", fontSize: 30, color: "#c7d1cb", marginTop: 30 }}>{card?.condition ?? "Collect · Trade · Connect"}</div>
        </div>
      </div>
    </div>,
    size,
  );
}
