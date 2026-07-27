import { createAdminClient } from "../lib/supabase/admin";
import { Product, ShopHome } from "./shop";

export const dynamic = "force-dynamic";

export default async function Home() {
  let managedProducts: Product[] = [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("cards").select("id,title,card_code,image_key,back_image_key,price_cents,categories(name)").eq("status", "active").order("updated_at", { ascending: false });
    const tones = ["yellow", "orange", "blue", "purple", "ice", "red"];
    managedProducts = (data ?? []).map((card, index) => {
      const category = Array.isArray(card.categories) ? card.categories[0]?.name : (card.categories as { name?: string } | null)?.name;
      return {
        id: card.id, title: card.title, series: category || "Other", price: card.price_cents / 100,
        tone: tones[index % tones.length], code: card.card_code || "TGMAX",
        icon: category?.toLowerCase().includes("fifa") ? "10" : "✦", tag: index < 2 ? "New" : "In stock",
        imageUrl: card.image_key ? supabase.storage.from("card-images").getPublicUrl(card.image_key).data.publicUrl : undefined,
        backImageUrl: card.back_image_key ? supabase.storage.from("card-images").getPublicUrl(card.back_image_key).data.publicUrl : undefined,
      };
    });
  } catch {
    // Sample products remain visible until Supabase is configured.
  }
  return <ShopHome managedProducts={managedProducts} />;
}
