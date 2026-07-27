import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getChatGPTUser } from "../../../chatgpt-auth";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: NextRequest) {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const member = await env.DB.prepare("SELECT status FROM cms_users WHERE email=?").bind(identity.email.toLowerCase()).first<{ status: string }>();
  if (!member || member.status !== "active") return NextResponse.json({ error: "You do not have CMS access" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, WebP, or AVIF image" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image must be smaller than 5 MB" }, { status: 400 });

  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const key = `cards/${crypto.randomUUID()}.${extension}`;
  await env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { uploadedBy: identity.email },
  });
  return NextResponse.json({ key, url: `/api/card-image/${encodeURIComponent(key)}` });
}
