import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json() as { username?: string; password?: string };
  const identifier = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!identifier || !password) return NextResponse.json({ error: "Username and password are required" }, { status: 400 });

  const admin = createAdminClient();
  const query = admin.from("cms_users").select("email,status");
  const { data: member } = identifier.includes("@")
    ? await query.eq("email", identifier).maybeSingle()
    : await query.ilike("username", identifier).maybeSingle();
  if (!member || member.status !== "active") return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: member.email, password });
  if (error) return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
