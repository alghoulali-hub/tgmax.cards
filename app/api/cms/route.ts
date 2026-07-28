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
  const [{ data: categories, error: categoriesError }, { data: cards, error: cardsError }, { data: users, error: usersError }, { data: options, error: optionsError }, { data: wantedCards, error: wantedError }, { data: settings, error: settingsError }, { data: labels, error: labelsError }] = await Promise.all([
    auth.admin.from("categories").select("*").order("name"),
    auth.admin.from("cards").select("*,categories(name),card_labels(name,color)").order("updated_at", { ascending: false }),
    auth.admin.from("cms_users").select("id,email,username,name,role,status,created_at").order("created_at"),
    auth.admin.from("card_options").select("*").order("option_type").order("sort_order").order("label"),
    auth.admin.from("wanted_cards").select("*,categories(name)").order("sort_order").order("updated_at", { ascending: false }),
    auth.admin.from("site_settings").select("value").eq("key", "whatsapp").maybeSingle(),
    auth.admin.from("card_labels").select("*").order("name"),
  ]);
  const error = categoriesError || cardsError || usersError || optionsError || wantedError || settingsError || labelsError;
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
      label_name: Array.isArray(card.card_labels) ? card.card_labels[0]?.name : card.card_labels?.name,
      label_color: Array.isArray(card.card_labels) ? card.card_labels[0]?.color : card.card_labels?.color,
    })),
    users: users ?? [],
    options: options ?? [],
    wantedCards: (wantedCards ?? []).map(item => ({
      ...item,
      category_name: Array.isArray(item.categories) ? item.categories[0]?.name : (item.categories as { name?: string } | null)?.name,
      image_url: item.image_key ? auth.admin.storage.from("card-images").getPublicUrl(item.image_key).data.publicUrl : null,
    })),
    whatsappSettings: settings?.value ?? null,
    labels: labels ?? [],
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
  } else if (action === "create_label") {
    if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    ({ error } = await auth.admin.from("card_labels").insert({ name: String(body.name ?? "").trim(), color: String(body.color ?? "#d8ff3e") }));
  } else if (action === "create_card") {
    ({ error } = await auth.admin.from("cards").insert({
      title: String(body.title ?? "").trim(), category_id: Number(body.categoryId), card_code: String(body.cardCode ?? "").trim(),
      image_key: body.imageKey ? String(body.imageKey) : null, back_image_key: body.backImageKey ? String(body.backImageKey) : null,
      price_cents: Math.round(Number(body.price ?? 0) * 100),
      stock: Math.max(0, Number(body.stock ?? 0)), condition: String(body.condition ?? "Near mint"), status: String(body.status ?? "active"), label_id: body.labelId ? Number(body.labelId) : null,
    }));
  } else if (action === "create_option") {
    if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    const optionType = String(body.optionType ?? "");
    const label = String(body.label ?? "").trim();
    if (!["status", "condition"].includes(optionType) || !label) return NextResponse.json({ error: "Option type and label are required" }, { status: 400 });
    const value = optionType === "status" ? slugify(label) : label;
    ({ error } = await auth.admin.from("card_options").insert({ option_type: optionType, label, value, sort_order: Number(body.sortOrder ?? 0) }));
  } else if (action === "create_wanted_card") {
    ({ error } = await auth.admin.from("wanted_cards").insert({
      title: String(body.title ?? "").trim(), category_id: Number(body.categoryId), details: String(body.details ?? "").trim(),
      priority: String(body.priority ?? "Open to offers").trim(), tone: String(body.tone ?? "purple"),
      status: String(body.status ?? "active"), sort_order: Number(body.sortOrder ?? 0), image_key: body.imageKey ? String(body.imageKey) : null,
    }));
  } else if (action === "create_user") {
    if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    const email = String(body.email ?? "").trim().toLowerCase();
    const username = slugify(String(body.username ?? ""));
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();
    if (!email || !name || !username || password.length < 8) return NextResponse.json({ error: "Name, email, username, and a password of at least 8 characters are required" }, { status: 400 });
    const created = await auth.admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
    if (created.error) error = created.error;
    if (!error) ({ error } = await auth.admin.from("cms_users").insert({ email, username, name, role: String(body.role ?? "editor"), status: "active", auth_user_id: created.data.user?.id ?? null }));
  } else if (action === "update_whatsapp_settings") {
    if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    const phoneNumber = String(body.phoneNumber ?? "").replace(/\D/g, "");
    if (phoneNumber.length < 8 || phoneNumber.length > 15) return NextResponse.json({ error: "Enter a valid international WhatsApp number" }, { status: 400 });
    ({ error } = await auth.admin.from("site_settings").upsert({
      key: "whatsapp",
      value: {
        phone_number: phoneNumber,
        display_number: String(body.displayNumber ?? "").trim() || `+${phoneNumber}`,
        greeting: String(body.greeting ?? "").trim() || "Hi TGMAX!",
        location: String(body.location ?? "").trim(),
        reply_time: String(body.replyTime ?? "").trim(),
        enabled: body.enabled !== false,
      },
      updated_at: new Date().toISOString(),
    }));
  } else if (action === "update_card") {
    const { data: previous } = await auth.admin.from("cards").select("image_key,back_image_key").eq("id", Number(body.id)).single();
    const nextImageKey = body.imageKey ? String(body.imageKey) : null;
    const nextBackImageKey = body.backImageKey ? String(body.backImageKey) : null;
    ({ error } = await auth.admin.from("cards").update({
      title: String(body.title), category_id: Number(body.categoryId), card_code: String(body.cardCode ?? ""), image_key: nextImageKey, back_image_key: nextBackImageKey,
      price_cents: Math.round(Number(body.price) * 100), stock: Math.max(0, Number(body.stock)), condition: String(body.condition),
      status: String(body.status), label_id: body.labelId ? Number(body.labelId) : null, updated_at: new Date().toISOString(),
    }).eq("id", Number(body.id)));
    if (!error && previous?.image_key && previous.image_key !== nextImageKey) await auth.admin.storage.from("card-images").remove([previous.image_key]);
    if (!error && previous?.back_image_key && previous.back_image_key !== nextBackImageKey) await auth.admin.storage.from("card-images").remove([previous.back_image_key]);
  } else if (action === "update_category") {
    const name = String(body.name ?? "").trim();
    ({ error } = await auth.admin.from("categories").update({ name, slug: slugify(name), accent: String(body.accent ?? "#d8ff3e") }).eq("id", Number(body.id)));
  } else if (action === "update_label") {
    if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    ({ error } = await auth.admin.from("card_labels").update({ name: String(body.name ?? "").trim(), color: String(body.color ?? "#d8ff3e") }).eq("id", Number(body.id)));
  } else if (action === "update_user") {
    if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    if (Number(body.id) === auth.member.id && body.status === "disabled") return NextResponse.json({ error: "You cannot disable yourself" }, { status: 400 });
    const username = slugify(String(body.username ?? ""));
    if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });
    const { data: target } = await auth.admin.from("cms_users").select("auth_user_id").eq("id", Number(body.id)).single();
    const password = String(body.password ?? "");
    if (password && password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    if (password && target?.auth_user_id) {
      const updatedAuth = await auth.admin.auth.admin.updateUserById(target.auth_user_id, { password });
      if (updatedAuth.error) error = updatedAuth.error;
    }
    if (!error) ({ error } = await auth.admin.from("cms_users").update({ username, name: String(body.name), role: String(body.role), status: String(body.status) }).eq("id", Number(body.id)));
  } else if (action === "update_option") {
    if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    const { data: current } = await auth.admin.from("card_options").select("option_type,value").eq("id", Number(body.id)).single();
    const label = String(body.label ?? "").trim();
    if (!current || !label) return NextResponse.json({ error: "Option not found or label is empty" }, { status: 400 });
    const nextValue = current.option_type === "status" ? slugify(label) : label;
    if (current.value !== nextValue) {
      const column = current.option_type === "status" ? "status" : "condition";
      await auth.admin.from("cards").update({ [column]: nextValue }).eq(column, current.value);
    }
    ({ error } = await auth.admin.from("card_options").update({ label, value: nextValue, sort_order: Number(body.sortOrder ?? 0) }).eq("id", Number(body.id)));
  } else if (action === "update_wanted_card") {
    const { data: previousWanted } = await auth.admin.from("wanted_cards").select("image_key").eq("id", Number(body.id)).single();
    const nextWantedImage = body.imageKey ? String(body.imageKey) : null;
    ({ error } = await auth.admin.from("wanted_cards").update({
      title: String(body.title ?? "").trim(), category_id: Number(body.categoryId), details: String(body.details ?? "").trim(),
      priority: String(body.priority ?? "Open to offers").trim(), tone: String(body.tone ?? "purple"),
      status: String(body.status ?? "active"), sort_order: Number(body.sortOrder ?? 0), image_key: nextWantedImage, updated_at: new Date().toISOString(),
    }).eq("id", Number(body.id)));
    if (!error && previousWanted?.image_key && previousWanted.image_key !== nextWantedImage) await auth.admin.storage.from("card-images").remove([previousWanted.image_key]);
  } else if (action === "delete_card") {
    const { data: card } = await auth.admin.from("cards").select("image_key,back_image_key").eq("id", Number(body.id)).single();
    ({ error } = await auth.admin.from("cards").delete().eq("id", Number(body.id)));
    if (!error && card?.image_key) await auth.admin.storage.from("card-images").remove([card.image_key]);
    if (!error && card?.back_image_key) await auth.admin.storage.from("card-images").remove([card.back_image_key]);
  } else if (action === "delete_category") {
    if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    ({ error } = await auth.admin.from("categories").delete().eq("id", Number(body.id)));
  } else if (action === "delete_label") {
    if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    ({ error } = await auth.admin.from("card_labels").delete().eq("id", Number(body.id)));
  } else if (action === "delete_option") {
    if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    const { data: option } = await auth.admin.from("card_options").select("option_type,value").eq("id", Number(body.id)).single();
    if (!option) return NextResponse.json({ error: "Option not found" }, { status: 404 });
    const column = option.option_type === "status" ? "status" : "condition";
    const { count: usage } = await auth.admin.from("cards").select("*", { count: "exact", head: true }).eq(column, option.value);
    if (usage) return NextResponse.json({ error: `This option is used by ${usage} card${usage === 1 ? "" : "s"}` }, { status: 400 });
    ({ error } = await auth.admin.from("card_options").delete().eq("id", Number(body.id)));
  } else if (action === "delete_wanted_card") {
    const { data: wanted } = await auth.admin.from("wanted_cards").select("image_key").eq("id", Number(body.id)).single();
    ({ error } = await auth.admin.from("wanted_cards").delete().eq("id", Number(body.id)));
    if (!error && wanted?.image_key) await auth.admin.storage.from("card-images").remove([wanted.image_key]);
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  if (error) return NextResponse.json({ error: error.message.includes("duplicate") ? "That value already exists" : error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
