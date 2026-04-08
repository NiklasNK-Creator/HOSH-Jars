export default function Home() {
  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#020617", color: "#e2e8f0", fontFamily: "Inter, Arial, sans-serif" }}>
      <h1 style={{ marginTop: 0 }}>HOSH Stats Web</h1>
      <p>Dashboard backend is running.</p>
      <p style={{ color: "#94a3b8" }}>Use the plugin flow via `/api/hosh/register`, `/api/hosh/render`, `/api/hosh/update`, `/api/hosh/page`.</p>
    </main>
  );
}