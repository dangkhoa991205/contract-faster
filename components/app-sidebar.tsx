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
    <aside className="w-56 flex-shrink-0 border-r border-zinc-200 bg-white flex flex-col min-h-screen">
      <div className="px-4 py-5 border-b border-zinc-100">
        <span className="font-semibold text-zinc-900 text-base">
          ContractAI
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-indigo-50 text-indigo-700"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
