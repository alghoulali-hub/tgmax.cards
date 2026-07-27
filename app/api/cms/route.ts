import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";

type D1Result<T> = { results?: T[] };

async function initialize() {
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS cms_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      accent TEXT NOT NULL DEFAULT '#d8ff3e',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      card_code TEXT NOT NULL DEFAULT '',
      image_key TEXT,
      price_cents INTEGER NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      condition TEXT NOT NULL DEFAULT 'Near mint',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS cards_category_idx ON cards (category_id)"),
  ]);
}

async function authorize() {
  const identity = await getChatGPTUser();
  if (!identity) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  await initialize();
  const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM cms_users").first<{ count: number }>();
  if (!count?.count) {
    await env.DB.prepare("INSERT INTO cms_users (email, name, role, status, created_at) VALUES (?, ?, 'owner', 'active', ?)")
      .bind(identity.email.toLowerCase(), identity.displayName, new Date().toISOString()).run();
  }
  const member = await env.DB.prepare("SELECT id, email, name, role, status FROM cms_users WHERE email = ?")
    .bind(identity.email.toLowerCase()).first<{ id: number; email: string; name: string; role: string; status: string }>();
  if (!member || member.status !== "active") return { error: NextResponse.json({ error: "You do not have CMS access" }, { status: 403 }) };
  return { identity, member };
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET() {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const [categoryRows, cardRows, userRows] = await env.DB.batch([
    env.DB.prepare("SELECT c.*, COUNT(cards.id) AS item_count FROM categories c LEFT JOIN cards ON cards.category_id = c.id GROUP BY c.id ORDER BY c.name"),
    env.DB.prepare("SELECT cards.*, categories.name AS category_name FROM cards JOIN categories ON categories.id = cards.category_id ORDER BY cards.updated_at DESC"),
    env.DB.prepare("SELECT id, email, name, role, status, created_at FROM cms_users ORDER BY created_at"),
  ]) as [D1Result<unknown>, D1Result<unknown>, D1Result<unknown>];
  return NextResponse.json({
    currentUser: auth.member,
    categories: categoryRows.results ?? [],
    cards: cardRows.results ?? [],
    users: userRows.results ?? [],
  });
}

export async function POST(request: NextRequest) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const body = await request.json() as Record<string, unknown>;
  const action = String(body.action ?? "");
  const now = new Date().toISOString();
  const elevated = auth.member.role === "owner" || auth.member.role === "admin";

  try {
    if (action === "create_category") {
      const name = String(body.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });
      await env.DB.prepare("INSERT INTO categories (name, slug, accent, created_at) VALUES (?, ?, ?, ?)")
        .bind(name, slugify(name), String(body.accent ?? "#d8ff3e"), now).run();
    } else if (action === "create_card") {
      await env.DB.prepare(`INSERT INTO cards
        (title, category_id, card_code, image_key, price_cents, stock, condition, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(String(body.title ?? "").trim(), Number(body.categoryId), String(body.cardCode ?? "").trim(),
          body.imageKey ? String(body.imageKey) : null,
          Math.round(Number(body.price ?? 0) * 100), Math.max(0, Number(body.stock ?? 0)),
          String(body.condition ?? "Near mint"), String(body.status ?? "active"), now, now).run();
    } else if (action === "create_user") {
      if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      const email = String(body.email ?? "").trim().toLowerCase();
      const name = String(body.name ?? "").trim();
      if (!email || !name) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
      await env.DB.prepare("INSERT INTO cms_users (email, name, role, status, created_at) VALUES (?, ?, ?, 'active', ?)")
        .bind(email, name, String(body.role ?? "editor"), now).run();
    } else if (action === "update_card") {
      const previous = await env.DB.prepare("SELECT image_key FROM cards WHERE id=?").bind(Number(body.id)).first<{ image_key: string | null }>();
      const nextImageKey = body.imageKey ? String(body.imageKey) : null;
      await env.DB.prepare(`UPDATE cards SET title=?, category_id=?, card_code=?, image_key=?, price_cents=?, stock=?, condition=?, status=?, updated_at=? WHERE id=?`)
        .bind(String(body.title), Number(body.categoryId), String(body.cardCode ?? ""), nextImageKey, Math.round(Number(body.price) * 100),
          Math.max(0, Number(body.stock)), String(body.condition), String(body.status), now, Number(body.id)).run();
      if (previous?.image_key && previous.image_key !== nextImageKey) await env.MEDIA.delete(previous.image_key);
    } else if (action === "update_category") {
      const name = String(body.name ?? "").trim();
      await env.DB.prepare("UPDATE categories SET name=?, slug=?, accent=? WHERE id=?")
        .bind(name, slugify(name), String(body.accent ?? "#d8ff3e"), Number(body.id)).run();
    } else if (action === "update_user") {
      if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      if (Number(body.id) === auth.member.id && body.status === "disabled") return NextResponse.json({ error: "You cannot disable yourself" }, { status: 400 });
      await env.DB.prepare("UPDATE cms_users SET name=?, role=?, status=? WHERE id=?")
        .bind(String(body.name), String(body.role), String(body.status), Number(body.id)).run();
    } else if (action === "delete_card") {
      const card = await env.DB.prepare("SELECT image_key FROM cards WHERE id=?").bind(Number(body.id)).first<{ image_key: string | null }>();
      await env.DB.prepare("DELETE FROM cards WHERE id=?").bind(Number(body.id)).run();
      if (card?.image_key) await env.MEDIA.delete(card.image_key);
    } else if (action === "delete_category") {
      if (!elevated) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      await env.DB.prepare("DELETE FROM categories WHERE id=?").bind(Number(body.id)).run();
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message.includes("UNIQUE") ? "That value already exists" : "Unable to save this change" }, { status: 400 });
  }
}
