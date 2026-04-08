export type SessionPoint = { joinTs: number; leaveTs: number; durationMs: number; afkMs: number };
export type EconomyPoint = { balance: number; xp: number; level: number; capturedAt: number };
export type SkinCapePoint = { skin: string; cape: string; changedAt: number };
export type BanPoint = { reason: string; startsAt: number; endsAt: number | null; active: boolean };
export type CustomValue = { label: string; value: string; mode: "static" | "live" | string };

export type PlayerPage = {
  playerUuid: string;
  playerName: string;
  firstSeen: number;
  lastSeen: number;
  totalPlayMs: number;
  chatLines: string[];
  sessions: SessionPoint[];
  economyPoints: EconomyPoint[];
  skinHistory: SkinCapePoint[];
  banHistory: BanPoint[];
  minigame: { kills: number; deaths: number; xp: number; level: number };
  lastSkin: string;
  lastCape: string;
  customStatic: CustomValue[];
  customLive: CustomValue[];
  online: boolean;
  createdAt: number;
  expiresAt: number;
  lastAliveAt: number;
};

type ServerEntry = {
  serverId: string;
  hostname: string;
  lastAliveAt: number;
  pages: Map<string, PlayerPage>;
};

const PAGE_TTL_MS = 15 * 60 * 1000;
const SERVER_TIMEOUT_MS = 15 * 60 * 1000;

declare global {
  var __hoshServers: Map<string, ServerEntry> | undefined;
}

const servers = globalThis.__hoshServers ?? new Map<string, ServerEntry>();
if (!globalThis.__hoshServers) {
  globalThis.__hoshServers = servers;
}

export function cleanup() {
  const now = Date.now();
  for (const [serverId, server] of servers.entries()) {
    if (now - server.lastAliveAt > SERVER_TIMEOUT_MS) {
      servers.delete(serverId);
      continue;
    }
    for (const [playerUuid, page] of server.pages.entries()) {
      if (page.expiresAt <= now) {
        server.pages.delete(playerUuid);
      }
    }
  }
}

export function registerServer(serverId: string, hostname: string) {
  cleanup();
  const now = Date.now();
  const current = servers.get(serverId);
  if (current) {
    current.hostname = hostname;
    current.lastAliveAt = now;
    return;
  }
  servers.set(serverId, { serverId, hostname, lastAliveAt: now, pages: new Map() });
}

export function markAlive(serverId: string) {
  cleanup();
  const server = servers.get(serverId);
  if (!server) return false;
  server.lastAliveAt = Date.now();
  return true;
}

export function renderPage(serverId: string, player: any) {
  cleanup();
  const server = servers.get(serverId);
  if (!server) return null;
  const now = Date.now();
  const page: PlayerPage = {
    playerUuid: String(player.uuid ?? ""),
    playerName: String(player.name ?? "Unknown"),
    firstSeen: Number(player.firstSeen ?? 0),
    lastSeen: Number(player.lastSeen ?? 0),
    totalPlayMs: Number(player.totalPlayMs ?? 0),
    chatLines: Array.isArray(player.chatLines) ? player.chatLines.slice(0, 120).map(String) : [],
    sessions: Array.isArray(player.sessions) ? player.sessions.slice(0, 64) : [],
    economyPoints: Array.isArray(player.economyPoints) ? player.economyPoints.slice(0, 96) : [],
    skinHistory: Array.isArray(player.skinHistory) ? player.skinHistory.slice(0, 48) : [],
    banHistory: Array.isArray(player.banHistory) ? player.banHistory.slice(0, 48) : [],
    minigame: {
      kills: Number(player.minigame?.kills ?? 0),
      deaths: Number(player.minigame?.deaths ?? 0),
      xp: Number(player.minigame?.xp ?? 0),
      level: Number(player.minigame?.level ?? 0)
    },
    lastSkin: String(player.lastSkin ?? ""),
    lastCape: String(player.lastCape ?? ""),
    customStatic: Array.isArray(player.customStatic) ? player.customStatic.slice(0, 10) : [],
    customLive: Array.isArray(player.customLive) ? player.customLive.slice(0, 10) : [],
    online: false,
    createdAt: now,
    expiresAt: now + PAGE_TTL_MS,
    lastAliveAt: server.lastAliveAt
  };
  server.pages.set(page.playerUuid, page);
  return page;
}

export function updateLive(serverId: string, playerUuid: string, live: any) {
  cleanup();
  const server = servers.get(serverId);
  if (!server) return false;
  const page = server.pages.get(playerUuid);
  if (!page) return false;
  page.totalPlayMs = Number(live.totalPlayMs ?? page.totalPlayMs);
  page.online = Boolean(live.online);
  if (Array.isArray(live.customLive)) {
    page.customLive = live.customLive.slice(0, 10);
  }
  return true;
}

export function getPage(serverId: string, playerUuid: string) {
  cleanup();
  const server = servers.get(serverId);
  if (!server) return null;
  return server.pages.get(playerUuid) ?? null;
}