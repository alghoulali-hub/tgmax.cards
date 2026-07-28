export type WhatsAppSettings = {
  phone_number: string;
  display_number: string;
  greeting: string;
  location: string;
  reply_time: string;
  enabled: boolean;
};

export const defaultWhatsAppSettings: WhatsAppSettings = {
  phone_number: "96171234567",
  display_number: "+961 71 234 567",
  greeting: "Hi TGMAX!",
  location: "Beirut, Lebanon",
  reply_time: "Usually within an hour",
  enabled: true,
};

export function whatsappUrl(settings: WhatsAppSettings, message: string) {
  const phone = settings.phone_number.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export async function loadWhatsAppSettings(admin: ReturnType<typeof import("./supabase/admin").createAdminClient>) {
  const { data } = await admin.from("site_settings").select("value").eq("key", "whatsapp").maybeSingle();
  return { ...defaultWhatsAppSettings, ...((data?.value as Partial<WhatsAppSettings> | null) ?? {}) };
}
