# HOSH Stats Web (Next.js)

External dashboard server for HOSH Stats.
This deployment is production-only (no test/demo pages).

## Lifecycle

- Plugin startup -> POST `/api/hosh/register` with `serverId`, `hostname`, `key`
- Every 5 minutes -> POST `/api/hosh/alive`
- If no alive for >15 minutes -> server pages are removed automatically
- `/stats <player>` -> plugin POSTs `/api/hosh/render` and gets a unique player URL
- Every 5 seconds -> plugin POSTs `/api/hosh/update` for live values
- Each subpage has a max lifetime of 15 minutes

## Data domains rendered

- Core: UUID, name, online status, playtime, first/last seen
- Sessions/AFK: session durations, afk values
- Chat history
- Economy snapshots: balance, xp, level trends
- PvP/minigame: kills, deaths, xp, level
- Moderation: ban history timeline
- Skins/capes: latest and history
- Custom values: up to 10 total slots, each `static` or `live`

## Custom values (0-10)

Configure in plugin `Stats/config.yml` under `custom.slots`:

- `label`: display name in dashboard
- `placeholder`: PlaceholderAPI placeholder
- `mode`: `static` (resolved on page creation) or `live` (updated every 5s)

Hard limit is 10 values total to protect server performance.

## Start

```bash
npm install
npm run dev
```

Set env on host:

- `HOSH_SHARED_KEY=F62ZEsnlSTMHYG3WT4REfZVIXcUcTkRW`

Use the same key in plugin `HoshStatsPlugin`.