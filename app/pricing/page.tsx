"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    key: "FREE",
    name: "Free",
    price: "$0",
    period: "mãi mãi",
    color: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.08)",
    accent: "#9ca3af",
    features: ["3 hợp đồng/tháng", "Template có sẵn", "Xuất DOCX"],
    cta: "Bắt đầu miễn phí",
    href: "/auth/login",
  },
  {
    key: "SOLO",
    name: "Solo",
    price: "$9",
    period: "/tháng",
    color: "rgba(99,102,241,0.07)",
    borderColor: "rgba(99,102,241,0.25)",
    accent: "#a5b4fc",
    features: ["50 hợp đồng/tháng", "Upload template riêng", "AI Smart Fill", "20 AI chat/ngày", "Voice commands"],
    cta: "Chọn Solo",
    href: null,
  },
  {
    key: "TEAM",
    name: "Team",
    price: "$29",
    period: "/tháng",
    color: "rgba(20,184,166,0.08)",
    borderColor: "rgba(20,184,166,0.35)",
    accent: "#5eead4",
    popular: true,
    features: ["Không giới hạn hợp đồng", "Chia sẻ template trong team", "AI Chat không giới hạn", "Tối đa 10 thành viên", "Đa ngôn ngữ"],
    cta: "Chọn Team",
    href: null,
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    price: "$99",
    period: "/tháng",
    color: "rgba(168,85,247,0.07)",
    borderColor: "rgba(168,85,247,0.25)",
    accent: "#d8b4fe",
    features: ["Không giới hạn mọi thứ", "White-label", "API access", "Thành viên không giới hạn", "Priority support 24/7"],
    cta: "Chọn Enterprise",
    href: null,
  },
];

export default function PricingPage() {
  const router = useRouter();

  async function handleSelect(planKey: string, href: string | null) {
    if (href) { router.push(href); return; }
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planKey }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      router.push("/auth/login");
    }
  }

  return (
    <div style={{ background: "#05060f", minHeight: "100vh", color: "#e8eaf0" }}>
      {/* Nav */}
      <nav style={{
        maxWidth: 1120, margin: "0 auto", padding: "0 24px",
        height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "linear-gradient(135deg, #6366f1, #14b8a6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
          }}>⚡</div>
          <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>Contract Faster</span>
        </Link>
        <Link href="/auth/login" style={{ color: "#a5b4fc", fontSize: 14, textDecoration: "none" }}>
          Đăng nhập →
        </Link>
      </nav>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "72px 24px 100px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#a5b4fc",
            marginBottom: 20, fontWeight: 500,
          }}>
            Pricing
          </div>
          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 400, fontStyle: "italic",
            color: "white", margin: "0 0 14px", lineHeight: 1.1, letterSpacing: "-0.02em",
          }}>
            Start free.<br />
            <span style={{
              background: "linear-gradient(135deg, #818cf8, #5eead4)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>Scale when ready.</span>
          </h1>
          <p style={{ color: "rgba(232,234,240,0.45)", fontSize: 16, lineHeight: 1.6 }}>
            Bắt đầu miễn phí với 3 hợp đồng/tháng. Nâng cấp khi doanh nghiệp của bạn lớn hơn.
          </p>
        </div>

        {/* Plans grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              style={{
                background: plan.color,
                border: `1px solid ${plan.borderColor}`,
                borderRadius: 18,
                padding: "28px 24px",
                display: "flex", flexDirection: "column",
                position: "relative",
              }}
            >
              {plan.popular && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: "#14b8a6", color: "white",
                  fontSize: 11, fontWeight: 600,
                  padding: "3px 14px", borderRadius: 100, whiteSpace: "nowrap",
                }}>
                  Phổ biến nhất
                </div>
              )}

              <div style={{ marginBottom: 4, fontSize: 16, fontWeight: 600, color: "white" }}>{plan.name}</div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: plan.accent, lineHeight: 1 }}>{plan.price}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginLeft: 2 }}>{plan.period}</span>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "rgba(232,234,240,0.55)" }}>
                    <Check style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1, color: plan.accent }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan.key, plan.href ?? null)}
                style={{
                  width: "100%", padding: "11px",
                  background: plan.popular ? "#14b8a6" : `${plan.borderColor}`,
                  border: `1px solid ${plan.borderColor}`,
                  borderRadius: 10, color: plan.popular ? "white" : plan.accent,
                  fontSize: 14, fontWeight: 500, cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 72, textAlign: "center" }}>
          <p style={{ color: "rgba(232,234,240,0.35)", fontSize: 14 }}>
            Câu hỏi? Email chúng tôi tại{" "}
            <a href="mailto:hello@contractfaster.io" style={{ color: "#a5b4fc", textDecoration: "none" }}>
              hello@contractfaster.io
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
