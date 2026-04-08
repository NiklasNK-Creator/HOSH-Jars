import { NextRequest, NextResponse } from "next/server";
import { validateKey } from "@/lib/auth";
import { updateLive } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!validateKey(body?.key)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!body?.serverId || !body?.player?.uuid || body?.live == null) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const ok = updateLive(body.serverId, body.player.uuid, body.live);
  if (!ok) return NextResponse.json({ error: "page not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}