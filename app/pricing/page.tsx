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
    features: ["3 hợp đồng", "Template có sẵn", "Xuất DOCX"],
    cta: "Bắt đầu miễn phí",
    href: "/auth/login",
    highlighted: false,
  },
  {
    key: "SOLO",
    name: "Solo",
    price: "$9",
    period: "tháng",
    features: ["50 hợp đồng/tháng", "Upload template riêng", "AI Smart Fill", "AI Chat 20 msg/ngày", "Xuất DOCX"],
    cta: "Chọn Solo",
    href: null,
    highlighted: false,
  },
  {
    key: "TEAM",
    name: "Team",
    price: "$29",
    period: "tháng",
    features: ["Không giới hạn hợp đồng", "Chia sẻ template trong team", "AI Chat không giới hạn", "Tối đa 10 thành viên", "Đa ngôn ngữ"],
    cta: "Chọn Team",
    href: null,
    highlighted: true,
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    price: "$99",
    period: "tháng",
    features: ["Không giới hạn mọi thứ", "Custom template library", "Thành viên không giới hạn", "Priority support"],
    cta: "Chọn Enterprise",
    href: null,
    highlighted: false,
  },
];

export default function PricingPage() {
  const router = useRouter();

  async function handleSelect(planKey: string, href: string | null) {
    if (href) {
      router.push(href);
      return;
    }
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
    <div className="min-h-screen bg-white">
      <nav className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="font-semibold text-zinc-900">Contract Faster</Link>
        <Link href="/auth/login" className="text-sm text-indigo-600 hover:underline">
          Đăng nhập
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-center text-zinc-900 mb-4">Pricing</h1>
        <p className="text-center text-zinc-500 mb-12">
          Bắt đầu miễn phí, nâng cấp khi bạn cần.
        </p>

        <div className="grid grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`rounded-2xl border p-6 flex flex-col ${
                plan.highlighted
                  ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-400"
                  : "border-zinc-200 bg-white"
              }`}
            >
              {plan.highlighted && (
                <div className="text-xs font-medium text-indigo-600 mb-2">Phổ biến nhất</div>
              )}
              <div className="font-bold text-lg text-zinc-900 mb-1">{plan.name}</div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-zinc-900">{plan.price}</span>
                <span className="text-zinc-500 text-sm">/{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                    <Check className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSelect(plan.key, plan.href)}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  plan.highlighted
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
