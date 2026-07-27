import { redirect } from "next/navigation";
import { CardsCMS } from "./CardsCMS";
import { createClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <CardsCMS signedInAs={user.user_metadata?.full_name || user.email || "TGMAX user"} />;
}
