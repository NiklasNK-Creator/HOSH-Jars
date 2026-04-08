import { NextRequest, NextResponse } from "next/server";
import { validateKey } from "@/lib/auth";
import { markAlive } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!validateKey(body?.key)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!body?.serverId) {
    return NextResponse.json({ error: "missing serverId" }, { status: 400 });
  }
  const ok = markAlive(body.serverId);
  if (!ok) return NextResponse.json({ error: "server not registered" }, { status: 404 });
  return NextResponse.json({ ok: true });
}