import { NextRequest, NextResponse } from "next/server";
import { validateKey } from "@/lib/auth";
import { registerServer } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!validateKey(body?.key)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!body?.serverId || !body?.hostname) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  registerServer(body.serverId, body.hostname);
  return NextResponse.json({ ok: true });
}