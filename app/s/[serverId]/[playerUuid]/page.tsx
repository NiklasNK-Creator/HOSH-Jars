"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { SkinViewer } from "skinview3d";

type SessionPoint = { joinTs: number; leaveTs: number; durationMs: number; afkMs: number };
type SkinCapePoint = { skin: string; cape: string; changedAt: number };
type BanPoint = { reason: string; startsAt: number; endsAt: number | null; active: boolean };
type CustomValue = { label: string; value: string; mode: string };
type Point = { value: number; label: string };
type Hover = { x: number; y: number; label: string; value: number } | null;

type PageData = {
  playerName: string;
  playerUuid: string;
  firstSeen: number;
  lastSeen: number;
  totalPlayMs: number;
  chatLines: string[];
  sessions: SessionPoint[];
  skinHistory: SkinCapePoint[];
  banHistory: BanPoint[];
  minigame: { kills: number; deaths: number; xp: number; level: number };
  lastSkin: string;
  lastCape: string;
  customStatic: CustomValue[];
  customLive: CustomValue[];
  online: boolean;
  expiresAt: number;
};

function prettyMs(ms: number) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

function fmt(ts: number) {
  return new Date(ts).toLocaleString();
}

function statCard(label: string, value: string, accent?: string): React.CSSProperties {
  return {
    background: "linear-gradient(180deg, #111827 0%, #0b1220 100%)",
    border: `1px solid ${accent ?? "#253041"}`,
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)"
  };
}

function InteractiveLine({ points, color, title }: { points: Point[]; color: string; title: string }) {
  const w = 760;
  const h = 240;
  const [hover, setHover] = useState<Hover>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const coords = points.map((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * (w - 24) + 12;
    const y = h - 16 - (p.value / max) * (h - 32);
    return { x, y, point: p };
  });
  const poly = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `12,${h - 16} ${poly} ${w - 12},${h - 16}`;

  return (
    <div style={{ position: "relative" }}>
      <h3 style={{ margin: 0, marginBottom: 10, fontSize: 16, letterSpacing: 0.2 }}>{title}</h3>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ background: "#050b16", borderRadius: 12 }}>
        <polygon points={area} fill="rgba(34,211,238,0.10)" />
        <polyline fill="none" stroke={color} strokeWidth="3" points={poly} />
        {coords.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={5} fill={color} onMouseEnter={() => setHover({ x: c.x, y: c.y, label: c.point.label, value: c.point.value })} onMouseLeave={() => setHover(null)} />)}
      </svg>
      {hover && <div style={{ position: "absolute", left: `${(hover.x / w) * 100}%`, top: `${(hover.y / h) * 100}%`, transform: "translate(10px, -110%)", background: "#0b1322", border: "1px solid #334155", borderRadius: 8, padding: "6px 8px", fontSize: 12, pointerEvents: "none", whiteSpace: "nowrap" }}>{hover.label}: {hover.value}</div>}
    </div>
  );
}

function InteractiveBars({ points, color, title }: { points: Point[]; color: string; title: string }) {
  const w = 760;
  const h = 240;
  const [hover, setHover] = useState<Hover>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const barWidth = (w - 24) / Math.max(1, points.length);

  return (
    <div style={{ position: "relative" }}>
      <h3 style={{ margin: 0, marginBottom: 10, fontSize: 16, letterSpacing: 0.2 }}>{title}</h3>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ background: "#050b16", borderRadius: 12 }}>
        {points.map((p, i) => {
          const bh = (p.value / max) * (h - 32);
          const x = 12 + i * barWidth + 1;
          const y = h - 16 - bh;
          return <rect key={i} x={x} y={y} width={Math.max(3, barWidth - 2)} height={bh} fill={color} rx={3} onMouseEnter={() => setHover({ x: x + Math.max(3, barWidth - 2) / 2, y, label: p.label, value: p.value })} onMouseLeave={() => setHover(null)} />;
        })}
      </svg>
      {hover && <div style={{ position: "absolute", left: `${(hover.x / w) * 100}%`, top: `${(hover.y / h) * 100}%`, transform: "translate(10px, -110%)", background: "#0b1322", border: "1px solid #334155", borderRadius: 8, padding: "6px 8px", fontSize: 12, pointerEvents: "none", whiteSpace: "nowrap" }}>{hover.label}: {hover.value}</div>}
    </div>
  );
}

const panel: React.CSSProperties = {
  background: "linear-gradient(180deg, #111827 0%, #0b1220 100%)",
  border: "1px solid #223044",
  borderRadius: 14,
  padding: 14,
  boxShadow: "0 8px 24px rgba(0,0,0,0.22)"
};

export default function StatsPage({ params }: { params: Promise<{ serverId: string; playerUuid: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<PageData | null>(null);
  const skinCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [skin3dError, setSkin3dError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/hosh/page?serverId=${encodeURIComponent(resolvedParams.serverId)}&playerUuid=${encodeURIComponent(resolvedParams.playerUuid)}`);
        if (!res.ok) {
          if (!cancelled) setData(null);
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData(null);
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [resolvedParams.playerUuid, resolvedParams.serverId]);

  useEffect(() => {
    if (!data || !skinCanvasRef.current) return;
    const canvas = skinCanvasRef.current;
    let viewer: SkinViewer | null = null;
    setSkin3dError("");
    try {
      viewer = new SkinViewer({
        canvas,
        width: 128,
        height: 192,
        skin: `https://mc-heads.net/skin/${encodeURIComponent(data.playerUuid)}`
      });
      viewer.zoom = 0.8;
      viewer.fov = 35;
      viewer.autoRotate = true;
      viewer.autoRotateSpeed = 0.7;
      viewer.animation = null;
    } catch {
      setSkin3dError("3D render unavailable on this device/browser");
      return;
    }

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging || !viewer) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      viewer.playerObject.rotation.y += dx * 0.01;
      viewer.playerObject.rotation.x = Math.max(-0.6, Math.min(0.6, viewer.playerObject.rotation.x + dy * 0.005));
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onUp);
      viewer?.dispose();
    };
  }, [data?.playerUuid]);

  const activityByHour = useMemo<Point[]>(() => {
    const bins = Array.from({ length: 24 }, (_, h) => ({ h, v: 0 }));
    for (const s of data?.sessions ?? []) bins[new Date(s.joinTs).getHours()].v += 1;
    return bins.map((b) => ({ value: b.v, label: `${String(b.h).padStart(2, "0")}:00` }));
  }, [data]);

  const playtimeTrend = useMemo<Point[]>(() => {
    const sessions = (data?.sessions ?? []).slice(0, 24).reverse();
    let acc = 0;
    return sessions.map((s, i) => {
      acc += Math.max(0, s.durationMs);
      return { value: Math.round(acc / 60000), label: `Session ${i + 1}` };
    });
  }, [data]);

  const sessionDuration = useMemo<Point[]>(() => (data?.sessions ?? []).slice(0, 24).map((s, i) => ({ value: Math.round(Math.max(0, s.durationMs) / 60000), label: `Session ${i + 1}` })), [data]);

  if (!data) {
    return <main style={{ padding: 24, color: "#e2e8f0", background: "#020617", minHeight: "100vh" }}><h1>Page expired or not found</h1></main>;
  }

  const kdr = data.minigame.deaths <= 0 ? data.minigame.kills : data.minigame.kills / data.minigame.deaths;

  return (
    <main style={{ padding: 24, fontFamily: "Inter, Arial, sans-serif", background: "#020617", minHeight: "100vh", color: "#e2e8f0" }}>
      <section style={{ ...panel, marginBottom: 20, display: "flex", gap: 16, alignItems: "center", background: "linear-gradient(120deg, #111827 0%, #0b1220 70%, #0e1a2e 100%)" }}>
        <div>
          <canvas ref={skinCanvasRef} aria-label={`${data.playerName} interactive 3D skin render`} style={{ width: 96, height: 144, borderRadius: 12, border: "2px solid #1e293b", background: "#020617", display: skin3dError ? "none" : "block" }} />
          {skin3dError && (
            <img
              src={`https://mc-heads.net/body/${encodeURIComponent(data.playerUuid)}/right`}
              alt={`${data.playerName} skin fallback`}
              style={{ width: 96, height: 144, borderRadius: 12, border: "2px solid #1e293b", background: "#020617", display: "block" }}
            />
          )}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 0.3 }}>{data.playerName}</h1>
          <p style={{ margin: "6px 0 0 0", color: "#9fb1c9" }}>Player Dashboard</p>
          <p style={{ margin: "4px 0 0 0", color: "#6b7f99", fontSize: 13 }}>UUID: {data.playerUuid}</p>
          <p style={{ margin: "2px 0 0 0", color: "#6b7f99", fontSize: 13 }}>Link expires: {fmt(data.expiresAt)}</p>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={statCard("Status", data.online ? "Online" : "Offline", data.online ? "#1f7a43" : "#7a1f2d")}><div style={{ color: "#94a3b8", fontSize: 12 }}>Status</div><div style={{ fontSize: 26, color: data.online ? "#22c55e" : "#ef4444" }}>{data.online ? "Online" : "Offline"}</div></div>
        <div style={statCard("Playtime", prettyMs(data.totalPlayMs), "#204e7a")}><div style={{ color: "#94a3b8", fontSize: 12 }}>Total Playtime</div><div style={{ fontSize: 24 }}>{prettyMs(data.totalPlayMs)}</div></div>
        <div style={statCard("First Seen", fmt(data.firstSeen))}><div style={{ color: "#94a3b8", fontSize: 12 }}>First Seen</div><div>{fmt(data.firstSeen)}</div></div>
        <div style={statCard("Last Seen", fmt(data.lastSeen))}><div style={{ color: "#94a3b8", fontSize: 12 }}>Last Seen</div><div>{fmt(data.lastSeen)}</div></div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={panel}>{playtimeTrend.length ? <InteractiveLine points={playtimeTrend} color="#22d3ee" title="Playtime Progress" /> : <p style={{ color: "#94a3b8" }}>No playtime trend data yet.</p>}</div>
        <div style={panel}><InteractiveBars points={activityByHour} color="#f59e0b" title="Activity by Hour" /></div>
        <div style={panel}>{sessionDuration.length ? <InteractiveBars points={sessionDuration} color="#818cf8" title="Session Durations (minutes)" /> : <p style={{ color: "#94a3b8" }}>No session data yet.</p>}</div>
        <div style={panel}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>PvP / Minigame Snapshot</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "#050b16", border: "1px solid #1e293b", borderRadius: 10, padding: 10 }}><div style={{ color: "#94a3b8", fontSize: 12 }}>Kills</div><div style={{ fontSize: 24 }}>{data.minigame.kills}</div></div>
            <div style={{ background: "#050b16", border: "1px solid #1e293b", borderRadius: 10, padding: 10 }}><div style={{ color: "#94a3b8", fontSize: 12 }}>Deaths</div><div style={{ fontSize: 24 }}>{data.minigame.deaths}</div></div>
            <div style={{ background: "#050b16", border: "1px solid #1e293b", borderRadius: 10, padding: 10 }}><div style={{ color: "#94a3b8", fontSize: 12 }}>KDR</div><div style={{ fontSize: 24 }}>{kdr.toFixed(2)}</div></div>
            <div style={{ background: "#050b16", border: "1px solid #1e293b", borderRadius: 10, padding: 10 }}><div style={{ color: "#94a3b8", fontSize: 12 }}>XP / Level</div><div style={{ fontSize: 24 }}>{data.minigame.xp} / {data.minigame.level}</div></div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={panel}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Moderation Timeline</h2>
          {data.banHistory.length === 0 ? <p style={{ color: "#94a3b8" }}>No moderation entries.</p> : <ul style={{ margin: 0, paddingLeft: 18 }}>{data.banHistory.slice(0, 20).map((b, i) => <li key={i}>{b.active ? "Active" : "Past"} - {b.reason} - {fmt(b.startsAt)}</li>)}</ul>}
        </div>
        <div style={panel}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Skins / Capes History</h2>
          <p>Current skin: {data.lastSkin || "n/a"}</p>
          <p>Current cape: {data.lastCape || "n/a"}</p>
          {data.skinHistory.length === 0 ? <p style={{ color: "#94a3b8" }}>No skin history entries.</p> : <ul style={{ margin: 0, paddingLeft: 18 }}>{data.skinHistory.slice(0, 10).map((s, i) => <li key={i}>{fmt(s.changedAt)} - skin: {s.skin || "n/a"} cape: {s.cape || "n/a"}</li>)}</ul>}
        </div>
      </section>

      {(data.customStatic.length > 0 || data.customLive.length > 0) && (
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {data.customStatic.length > 0 && <div style={panel}><h2 style={{ marginTop: 0, fontSize: 18 }}>Custom Static Values</h2>{data.customStatic.map((v, i) => <p key={i}>{v.label}: {v.value}</p>)}</div>}
          {data.customLive.length > 0 && <div style={panel}><h2 style={{ marginTop: 0, fontSize: 18 }}>Custom Live Values</h2>{data.customLive.map((v, i) => <p key={i}>{v.label}: {v.value}</p>)}</div>}
        </section>
      )}

      <section style={panel}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Chat Timeline</h2>
        {data.chatLines.length === 0 ? <p style={{ color: "#94a3b8" }}>No chat history recorded.</p> : <ul style={{ margin: 0, paddingLeft: 18 }}>{data.chatLines.slice(0, 40).map((line, i) => <li key={`${i}-${line}`}>{line}</li>)}</ul>}
      </section>
    </main>
  );
}