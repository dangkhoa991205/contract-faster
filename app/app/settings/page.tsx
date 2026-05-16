"use client";

import { useEffect, useState } from "react";
import { Loader2, Zap, Users, Building2, Check } from "lucide-react";

type Usage = {
  plan: string;
  contractsUsed: number;
  contractsLimit: number | null;
  aiChatsPerDay: number | null;
  subscription: { currentPeriodEnd: string } | null;
};

const PLANS = [
  {
    key: "SOLO",
    name: "Solo",
    price: "$9",
    period: "/tháng",
    icon: <Zap className="w-4 h-4" />,
    color: "#6366f1",
    features: ["50 hợp đồng/tháng", "20 AI chat/ngày", "Xuất DOCX", "Voice commands"],
  },
  {
    key: "TEAM",
    name: "Team",
    price: "$29",
    period: "/tháng",
    icon: <Users className="w-4 h-4" />,
    color: "#14b8a6",
    popular: true,
    features: ["Không giới hạn HĐ", "AI Chat đầy đủ", "Tối đa 10 thành viên", "Template sharing"],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    price: "$99",
    period: "/tháng",
    icon: <Building2 className="w-4 h-4" />,
    color: "#a855f7",
    features: ["Không giới hạn", "White-label", "API access", "Hỗ trợ ưu tiên 24/7"],
  },
];

export default function SettingsPage() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user/usage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {});
  }, []);

  async function handleUpgrade(plan: string) {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
    setLoading(false);
  }

  const usagePercent = usage && usage.contractsLimit
    ? Math.min((usage.contractsUsed / usage.contractsLimit) * 100, 100)
    : 0;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#f1f1f3" }}>
          Settings & Billing
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Quản lý gói dịch vụ và hạn mức sử dụng
        </p>
      </div>

      {/* Current usage */}
      {usage && (
        <div
          className="rounded-xl p-6 mb-8"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-medium" style={{ color: "#f1f1f3" }}>Gói hiện tại</h2>
            <span
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}
            >
              {usage.plan}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div
              className="rounded-lg p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                Hợp đồng tháng này
              </div>
              <div className="text-xl font-bold" style={{ color: "#f1f1f3" }}>
                {usage.contractsUsed}
                <span className="text-sm font-normal ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                  / {usage.contractsLimit ?? "∞"}
                </span>
              </div>
              {usage.contractsLimit && (
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${usagePercent}%`,
                      background: usagePercent > 80 ? "#f87171" : "#6366f1",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              )}
            </div>
            <div
              className="rounded-lg p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                AI Chat/ngày
              </div>
              <div className="text-xl font-bold" style={{ color: "#f1f1f3" }}>
                {usage.aiChatsPerDay === null ? "∞" : usage.aiChatsPerDay}
              </div>
            </div>
          </div>

          {usage.subscription && (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Gia hạn vào:{" "}
              <span style={{ color: "rgba(255,255,255,0.5)" }}>
                {new Date(usage.subscription.currentPeriodEnd).toLocaleDateString("vi-VN")}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Plans */}
      <h2 className="font-medium mb-4" style={{ color: "#f1f1f3" }}>Nâng cấp gói</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = usage?.plan === plan.key;
          return (
            <div
              key={plan.key}
              className="rounded-xl p-5 relative"
              style={{
                background: plan.popular ? `rgba(20,184,166,0.07)` : "rgba(255,255,255,0.03)",
                border: plan.popular
                  ? "1px solid rgba(20,184,166,0.3)"
                  : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {plan.popular && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-0.5 rounded-full font-medium"
                  style={{ background: "#14b8a6", color: "white" }}
                >
                  Phổ biến nhất
                </div>
              )}

              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${plan.color}22`, color: plan.color, border: `1px solid ${plan.color}44` }}
              >
                {plan.icon}
              </div>

              <div className="font-semibold mb-0.5" style={{ color: "#f1f1f3" }}>{plan.name}</div>
              <div className="flex items-baseline gap-0.5 mb-4">
                <span className="text-2xl font-bold" style={{ color: plan.color }}>{plan.price}</span>
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: plan.color }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.key)}
                disabled={loading || isCurrent}
                className="w-full py-2 text-sm rounded-lg font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                style={
                  isCurrent
                    ? { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }
                    : { background: plan.color, color: "white" }
                }
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {isCurrent ? "Gói hiện tại" : "Nâng cấp"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
