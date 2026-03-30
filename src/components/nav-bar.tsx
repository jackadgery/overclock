"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "SYS", icon: "◈" },
  { href: "/quests", label: "MISSIONS", icon: "⬡" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-oc-bg/90 backdrop-blur-sm border-t border-oc-border z-50">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
                isActive
                  ? "text-oc-cyan"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-mono uppercase tracking-widest">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
