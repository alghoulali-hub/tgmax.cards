import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const admin = createAdminClient();
  const { data: member } = await admin.from("cms_users").select("status").eq("email", user.email.toLowerCase()).maybeSingle();
  if (!member || member.status !== "active") return NextResponse.json({ error: "You do not have CMS access" }, { status: 403 });
  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, WebP, or AVIF image" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image must be smaller than 5 MB" }, { status: 400 });
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const key = `cards/${crypto.randomUUID()}.${extension}`;
  const { error } = await admin.storage.from("card-images").upload(key, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ key, url: admin.storage.from("card-images").getPublicUrl(key).data.publicUrl });
}
