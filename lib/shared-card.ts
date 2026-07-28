import { createAdminClient } from "./supabase/admin";

const fallbackCards = [
  { id: 1, title: "Pikachu VMAX", category: "Pokémon", price_cents: 4800, condition: "Near mint", card_code: "025/185" },
  { id: 2, title: "Charizard ex", category: "Pokémon", price_cents: 7200, condition: "Near mint", card_code: "125/197" },
  { id: 3, title: "Lionel Messi", category: "FIFA", price_cents: 3500, condition: "Excellent", card_code: "LEO 10" },
  { id: 4, title: "Kylian Mbappé", category: "FIFA", price_cents: 2800, condition: "Mint", card_code: "KMB 09" },
  { id: 5, title: "Blue-Eyes Dragon", category: "Yu-Gi-Oh!", price_cents: 5400, condition: "Good", card_code: "LOB-001" },
  { id: 6, title: "Luffy Gear Five", category: "One Piece", price_cents: 4100, condition: "Near mint", card_code: "OP05-119" },
];

export async function getSharedCard(id: string) {
  if (!/^\d+$/.test(id)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("cards")
    .select("id,title,card_code,image_key,price_cents,condition,status,categories(name)")
    .eq("id", Number(id))
    .eq("status", "active")
    .maybeSingle();
  if (!data) {
    const sample = fallbackCards.find(item => item.id === Number(id));
    return sample ? { ...sample, status: "active", imageUrl: null as string | null } : null;
  }
  const category = Array.isArray(data.categories) ? data.categories[0]?.name : (data.categories as { name?: string } | null)?.name;
  return {
    ...data,
    category: category ?? "Trading card",
    imageUrl: data.image_key ? admin.storage.from("card-images").getPublicUrl(data.image_key).data.publicUrl : null,
  };
}
