"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email hoặc mật khẩu không đúng. Dùng mật khẩu: test123");
    } else {
      router.push("/app");
    }
  }

  async function handleGoogle() {
    await signIn("google", { callbackUrl: "/app" });
  }

  return (
    <div
      style={{ background: "#080810", minHeight: "100vh" }}
      className="flex items-center justify-center px-4"
    >
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 32,
          width: "100%",
          maxWidth: 380,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div
            style={{
              width: 28, height: 28,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14,
            }}
          >⚡</div>
          <span style={{ color: "white", fontWeight: 600, fontSize: 15 }}>
            Contract Faster
          </span>
        </div>

        <h1 style={{ color: "white", fontWeight: 700, fontSize: 22, marginBottom: 4 }}>
          Đăng nhập
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
          Test: dùng bất kỳ email + mật khẩu{" "}
          <code style={{ color: "#a5b4fc" }}>test123</code>
        </p>

        <form onSubmit={handleCredentials} className="space-y-3">
          <div>
            <label style={{ color: "#9ca3af", fontSize: 13, display: "block", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%", padding: "10px 12px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, color: "white", fontSize: 14,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ color: "#9ca3af", fontSize: 13, display: "block", marginBottom: 6 }}>
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="test123"
              style={{
                width: "100%", padding: "10px 12px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, color: "white", fontSize: 14,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "11px",
              background: loading ? "#4338ca" : "#6366f1",
              color: "white", borderRadius: 8,
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 500, marginTop: 4,
            }}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập →"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ color: "#4b5563", fontSize: 12 }}>hoặc</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        <button
          onClick={handleGoogle}
          style={{
            width: "100%", padding: "11px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, color: "#d1d5db",
            cursor: "pointer", fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Đăng nhập với Google
        </button>
      </div>
    </div>
  );
}
