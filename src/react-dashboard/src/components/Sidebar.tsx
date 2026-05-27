"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Executive Summary", icon: "📊" },
  { href: "/sales", label: "Sales Performance", icon: "📈" },
  { href: "/distribution", label: "Distribution", icon: "🏪" },
  { href: "/pricing", label: "Pricing Compliance", icon: "💲" },
  { href: "/promotions", label: "Promotions", icon: "📣" },
  { href: "/trial-repeat", label: "Trial & Repeat", icon: "👥" },
  { href: "/sentiment", label: "Consumer Sentiment", icon: "💬" },
  { href: "/geo", label: "Geo Performance", icon: "🗺️" },
  { href: "/inventory", label: "Inventory & Supply", icon: "📦" },
  { href: "/architecture", label: "Architecture", icon: "🏗️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 min-h-screen bg-[#0f2a4a] border-r border-[#1a3d66] flex flex-col shadow-xl">
      <div className="p-4 border-b border-[#1a3d66]">
        <h1 className="font-bold text-lg text-white">Colgate-Palmolive</h1>
        <p className="text-xs text-blue-300">SKU Launch Analytics · 12-week post-launch</p>
      </div>
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-all ${active ? "bg-[#29b5e8]/20 text-[#29b5e8] font-medium border-r-3 border-[#29b5e8]" : "text-blue-100 hover:bg-[#1a3d66] hover:text-white"}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[#1a3d66]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#29b5e8] animate-pulse"></div>
          <span className="text-xs text-blue-300">Powered by Snowflake Cortex</span>
        </div>
      </div>
    </aside>
  );
}
