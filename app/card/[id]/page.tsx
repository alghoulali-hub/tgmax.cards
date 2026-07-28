import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "../../../lib/supabase/admin";
import { defaultWhatsAppSettings, loadWhatsAppSettings, whatsappUrl } from "../../../lib/whatsapp";
import { Footer, Header } from "../../shop";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

async function getCard(id: string) {
  if (!/^\d+$/.test(id)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("cards")
    .select("id,title,card_code,image_key,price_cents,condition,status,categories(name)")
    .eq("id", Number(id))
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const category = Array.isArray(data.categories) ? data.categories[0]?.name : (data.categories as { name?: string } | null)?.name;
  return {
    ...data,
    category: category ?? "Trading card",
    imageUrl: data.image_key ? admin.storage.from("card-images").getPublicUrl(data.image_key).data.publicUrl : null,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return { title: "Card not found — TGMAX" };
  const title = `${card.title} — TGMAX`;
  const description = `${card.category} trading card · ${card.condition} · $${(card.price_cents / 100).toFixed(2).replace(/\.00$/, "")}`;
  const images = card.imageUrl ? [{ url: card.imageUrl, alt: card.title }] : [];
  return {
    title,
    description,
    alternates: { canonical: `/card/${card.id}` },
    openGraph: { title, description, url: `/card/${card.id}`, type: "website", images },
    twitter: { card: "summary_large_image", title, description, images: card.imageUrl ? [card.imageUrl] : [] },
  };
}

export default async function SharedCardPage({ params }: PageProps) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) notFound();
  const admin = createAdminClient();
  let whatsappSettings = defaultWhatsAppSettings;
  try { whatsappSettings = await loadWhatsAppSettings(admin); } catch {}
  const price = `$${(card.price_cents / 100).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}`;

  return <main>
    <Header />
    <section className="shared-card-page">
      <div className="shared-card-layout">
        <div className="shared-card-image">{card.imageUrl ? <img src={card.imageUrl} alt={card.title} /> : <span className="brand-mark"><span>TG</span></span>}</div>
        <div className="shared-card-copy">
          <span className="kicker">{card.category} · {card.card_code || "TGMAX"}</span>
          <h1>{card.title}</h1>
          <p>A collectible card available from TGMAX.</p>
          <div className="shared-card-price"><b>{price}</b><span>{card.condition}</span></div>
          <div className="shared-card-actions">
            {whatsappSettings.enabled && <a href={whatsappUrl(whatsappSettings, `${whatsappSettings.greeting} Is the ${card.title} card still available?`)} target="_blank" rel="noreferrer">Ask on WhatsApp →</a>}
            <a className="secondary" href={`/#card-${card.id}`}>View in collection</a>
          </div>
        </div>
      </div>
    </section>
    <Footer whatsappSettings={whatsappSettings} />
  </main>;
}
