"use client";

import { useEffect, useState } from "react";

type Usage = {
  plan: string;
  contractsUsed: number;
  contractsLimit: number | null;
  aiChatsPerDay: number | null;
  subscription: { currentPeriodEnd: string } | null;
};

const PLANS = [
  { key: "SOLO", name: "Solo", price: "$9/tháng", features: ["50 hợp đồng/tháng", "AI gợi ý cơ bản", "Xuất DOCX"] },
  { key: "TEAM", name: "Team", price: "$29/tháng", features: ["Không giới hạn", "AI Chat đầy đủ", "Tối đa 10 thành viên"] },
  { key: "ENTERPRISE", name: "Enterprise", price: "$99/tháng", features: ["Không giới hạn", "Custom template library", "Hỗ trợ ưu tiên"] },
];

export default function SettingsPage() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user/usage")
      .then((r) => r.json())
      .then(setUsage);
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

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Settings & Billing</h1>

      {usage && (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-8">
          <h2 className="font-medium text-zinc-900 mb-4">Gói hiện tại: <span className="text-indigo-600">{usage.plan}</span></h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-zinc-500">Hợp đồng đã tạo</div>
              <div className="font-medium">{usage.contractsUsed} / {usage.contractsLimit ?? "∞"}</div>
            </div>
            <div>
              <div className="text-zinc-500">AI Chat mỗi ngày</div>
              <div className="font-medium">{usage.aiChatsPerDay ?? "∞"}</div>
            </div>
            {usage.subscription && (
              <div>
                <div className="text-zinc-500">Gia hạn vào</div>
                <div className="font-medium">
                  {new Date(usage.subscription.currentPeriodEnd).toLocaleDateString("vi-VN")}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <h2 className="font-medium text-zinc-900 mb-4">Nâng cấp gói</h2>
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div key={plan.key} className="border border-zinc-200 rounded-xl p-5">
            <div className="font-semibold text-zinc-900 mb-1">{plan.name}</div>
            <div className="text-indigo-600 font-bold mb-3">{plan.price}</div>
            <ul className="text-sm text-zinc-600 space-y-1 mb-4">
              {plan.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade(plan.key)}
              disabled={loading || usage?.plan === plan.key}
              className="w-full py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {usage?.plan === plan.key ? "Gói hiện tại" : "Nâng cấp"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
