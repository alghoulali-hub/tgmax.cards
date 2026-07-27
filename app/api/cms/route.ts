import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";

type Member = { id: number; email: string; name: string; role: "owner" | "admin" | "editor"; status: string };

async function authorize() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  const admin = createAdminClient();
  let { data: member } = await admin.from("cms_users").select("id,email,name,role,status").eq("email", user.email.toLowerCase()).maybeSingle<Member>();
  const { count } = await admin.from("cms_users").select("*", { count: "exact", head: true });
  if (!member && count === 0) {
    const created = await admin.from("cms_users").insert({
      email: user.email.toLowerCase(),
      name: user.user_metadata?.full_name || user.email.split("@")[0],
      role: "owner",
      status: "active",
      auth_user_id: user.id,
    }).select("id,email,name,role,status").single<Member>();
    member = created.data;
  } else if (member && !member.status.includes("disabled")) {
    await admin.from("cms_users").update({ auth_user_id: user.id }).eq("id", member.id).is("auth_user_id", null);
  }
  if (!member || member.status !== "active") return { error: NextResponse.json({ error: "You do not have CMS access" }, { status: 403 }) };
  return { admin, member, authUser: user };
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET() {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const [{ data: categories, error: categoriesError }, { data: cards, error: cardsError }, { data: users, error: usersError }] = await Promise.all([
    auth.admin.from("categories").select("*").order("name"),
    auth.admin.from("cards").select("*,categories(name)").order("updated_at", { ascending: false }),
    auth.admin.from("cms_users").select("id,email,name,role,status,created_at").order("created_at"),
  ]);
  const error = categoriesError || cardsError || usersError;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const itemCounts = new Map<number, number>();
  (cards ?? []).forEach(card => itemCounts.set(card.category_id, (itemCounts.get(card.category_id) ?? 0) + 1));
  return NextResponse.json({
    currentUser: auth.member,
    categories: (categories ?? []).map(category => ({ ...category, item_count: itemCounts.get(category.id) ?? 0 })),
    cards: (cards ?? []).map(card => ({
      ...card,
      category_name: Array.isArray(card.categories) ? card.categories[0]?.name : (card.categories as { name?: string } | null)?.name,
      image_url: card.image_key ? auth.admin.storage.from("card-images").getPublicUrl(card.image_key).data.publicUrl : null,
      back_image_url: card.back_image_key ? auth.admin.storage.from("card-images").getPublicUrl(card.back_image_key).data.publicUrl : null,
    })),
    users: users ?? [],
  });
}

export async function POST(request: NextRequest) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const body = await request.json() as Record<string, unknown>;
  const action = String(body.action ?? "");
  const elevated = auth.member.role === "owner" || auth.member.role === "admin";
  let error: { message: string } | null = null;

  if (action === "create_category") {
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    ({ error } = await auth.admin.from("categories").insert({ name, slug: slugify(name), accent: String(body.accent ?? "#d8ff3e") }));
  } else if (action === "create_card") {
    ({ error } = await auth.admin.from("cards").insert({
      title: String(body.title ?? "").trim(), category_id: Number(body.categoryId), card_code: String(body.cardCode ?? "").trim(),
      image_key: body.imageKey ? String(body.imageKey) : null, back_image_key: body.backImageKey ? String(body.backImageKey) : null,
      price_cents: Math.round(Number(body.price ?? 0) * 100),
      stock: Math.max(0, Number(body.stock ?? 0)), condition: String(body.condition ?? "Near mint"), status: String(body.status ?? "active"),
    }));
  } else if (action === "create_user") {
    if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    if (!email || !name) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    const invite = await auth.admin.auth.admin.inviteUserByEmail(email, { data: { full_name: name }, redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/cards` });
    if (invite.error && !invite.error.message.toLowerCase().includes("already")) error = invite.error;
    if (!error) ({ error } = await auth.admin.from("cms_users").insert({ email, name, role: String(body.role ?? "editor"), status: "active", auth_user_id: invite.data.user?.id ?? null }));
  } else if (action === "update_card") {
    const { data: previous } = await auth.admin.from("cards").select("image_key,back_image_key").eq("id", Number(body.id)).single();
    const nextImageKey = body.imageKey ? String(body.imageKey) : null;
    const nextBackImageKey = body.backImageKey ? String(body.backImageKey) : null;
    ({ error } = await auth.admin.from("cards").update({
      title: String(body.title), category_id: Number(body.categoryId), card_code: String(body.cardCode ?? ""), image_key: nextImageKey, back_image_key: nextBackImageKey,
      price_cents: Math.round(Number(body.price) * 100), stock: Math.max(0, Number(body.stock)), condition: String(body.condition),
      status: String(body.status), updated_at: new Date().toISOString(),
    }).eq("id", Number(body.id)));
    if (!error && previous?.image_key && previous.image_key !== nextImageKey) await auth.admin.storage.from("card-images").remove([previous.image_key]);
    if (!error && previous?.back_image_key && previous.back_image_key !== nextBackImageKey) await auth.admin.storage.from("card-images").remove([previous.back_image_key]);
  } else if (action === "update_category") {
    const name = String(body.name ?? "").trim();
    ({ error } = await auth.admin.from("categories").update({ name, slug: slugify(name), accent: String(body.accent ?? "#d8ff3e") }).eq("id", Number(body.id)));
  } else if (action === "update_user") {
    if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    if (Number(body.id) === auth.member.id && body.status === "disabled") return NextResponse.json({ error: "You cannot disable yourself" }, { status: 400 });
    ({ error } = await auth.admin.from("cms_users").update({ name: String(body.name), role: String(body.role), status: String(body.status) }).eq("id", Number(body.id)));
  } else if (action === "delete_card") {
    const { data: card } = await auth.admin.from("cards").select("image_key,back_image_key").eq("id", Number(body.id)).single();
    ({ error } = await auth.admin.from("cards").delete().eq("id", Number(body.id)));
    if (!error && card?.image_key) await auth.admin.storage.from("card-images").remove([card.image_key]);
    if (!error && card?.back_image_key) await auth.admin.storage.from("card-images").remove([card.back_image_key]);
  } else if (action === "delete_category") {
    if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    ({ error } = await auth.admin.from("categories").delete().eq("id", Number(body.id)));
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  if (error) return NextResponse.json({ error: error.message.includes("duplicate") ? "That value already exists" : error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
