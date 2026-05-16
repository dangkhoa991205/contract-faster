"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  ScrollText,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/templates", label: "Templates", icon: FileText },
  { href: "/app/contracts", label: "Hợp đồng", icon: ScrollText },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col min-h-screen"
      style={{
        background: "#0d0d18",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Logo */}
      <div
        className="px-4 py-5 flex items-center gap-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          ⚡
        </div>
        <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>
          Contract Faster
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "text-white"
                : "hover:text-white"
            )}
            style={
              pathname === href
                ? { background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }
                : { color: "rgba(255,255,255,0.45)" }
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-4 text-xs"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          color: "rgba(255,255,255,0.25)",
        }}
      >
        Contract Faster © 2025
      </div>
    </aside>
  );
}
