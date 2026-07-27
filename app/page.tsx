import { env } from "cloudflare:workers";
import { Product, ShopHome } from "./shop";

export const dynamic = "force-dynamic";

export default async function Home() {
  let managedProducts: Product[] = [];
  try {
    const query = await env.DB.prepare(`SELECT cards.id, cards.title, cards.card_code, cards.image_key, cards.price_cents,
      categories.name AS series, categories.accent
      FROM cards JOIN categories ON categories.id = cards.category_id
      WHERE cards.status = 'active' ORDER BY cards.updated_at DESC`).all<{
        id: number; title: string; card_code: string; image_key: string | null; price_cents: number; series: string; accent: string;
      }>();
    const tones = ["yellow", "orange", "blue", "purple", "ice", "red"];
    managedProducts = (query.results ?? []).map((card, index) => ({
      id: card.id,
      title: card.title,
      series: card.series,
      price: card.price_cents / 100,
      tone: tones[index % tones.length],
      code: card.card_code || "TGMAX",
      icon: card.series.toLowerCase().includes("fifa") ? "10" : "✦",
      tag: index < 2 ? "New" : "In stock",
      imageUrl: card.image_key ? `/api/card-image/${card.image_key}` : undefined,
    }));
  } catch {
    // Before the first CMS visit, the sample catalog remains visible.
  }
  return <ShopHome managedProducts={managedProducts} />;
}
