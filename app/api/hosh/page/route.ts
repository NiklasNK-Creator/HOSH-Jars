import { NextRequest, NextResponse } from "next/server";
import { getPage } from "@/lib/store";

export async function GET(req: NextRequest) {
  const serverId = req.nextUrl.searchParams.get("serverId") || "";
  const playerUuid = req.nextUrl.searchParams.get("playerUuid") || "";
  const page = getPage(serverId, playerUuid);
  if (!page) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(page);
}