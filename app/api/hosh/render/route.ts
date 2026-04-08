import { NextRequest, NextResponse } from "next/server";
import { validateKey } from "@/lib/auth";
import { renderPage } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!validateKey(body?.key)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!body?.serverId || !body?.player?.uuid || !body?.player?.name) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const page = renderPage(body.serverId, body.player);
  if (!page) return NextResponse.json({ error: "server not registered" }, { status: 404 });
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const url = `${proto}://${host}/s/${encodeURIComponent(body.serverId)}/${encodeURIComponent(body.player.uuid)}`;
  return NextResponse.json({ ok: true, url });
}