import { createAdminClient } from "../lib/supabase/admin";
import { Product, ShopHome } from "./shop";
import { defaultWhatsAppSettings, loadWhatsAppSettings } from "../lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function Home() {
  let managedProducts: Product[] = [];
  let whatsappSettings = defaultWhatsAppSettings;
  try {
    const supabase = createAdminClient();
    const [{ data }, savedSettings] = await Promise.all([
      supabase.from("cards").select("id,title,card_code,image_key,back_image_key,price_cents,condition,categories(name),card_labels(name,color)").eq("status", "active").order("updated_at", { ascending: false }),
      loadWhatsAppSettings(supabase),
    ]);
    whatsappSettings = savedSettings;
    const tones = ["yellow", "orange", "blue", "purple", "ice", "red"];
    managedProducts = (data ?? []).map((card, index) => {
      const category = Array.isArray(card.categories) ? card.categories[0]?.name : (card.categories as { name?: string } | null)?.name;
      return {
        id: card.id, title: card.title, series: category || "Other", price: card.price_cents / 100, condition: card.condition,
        tone: tones[index % tones.length], code: card.card_code || "TGMAX",
        icon: category?.toLowerCase().includes("fifa") ? "10" : "✦",
        tag: (Array.isArray(card.card_labels) ? card.card_labels[0]?.name : (card.card_labels as { name?: string } | null)?.name) || "",
        tagColor: (Array.isArray(card.card_labels) ? card.card_labels[0]?.color : (card.card_labels as { color?: string } | null)?.color) || undefined,
        imageUrl: card.image_key ? supabase.storage.from("card-images").getPublicUrl(card.image_key).data.publicUrl : undefined,
        backImageUrl: card.back_image_key ? supabase.storage.from("card-images").getPublicUrl(card.back_image_key).data.publicUrl : undefined,
      };
    });
  } catch {
    // Sample products remain visible until Supabase is configured.
  }
  return <ShopHome managedProducts={managedProducts} whatsappSettings={whatsappSettings} />;
}
