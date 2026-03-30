"use client";

import { STAT_INFO, type StatName } from "@/lib/types";

interface StatBadgeProps {
  stat: StatName;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function StatBadge({ stat, size = "sm", showLabel = false }: StatBadgeProps) {
  const info = STAT_INFO[stat];
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono uppercase tracking-wider rounded ${sizeClasses}`}
      style={{
        color: info.colour,
        backgroundColor: `${info.colour}15`,
        border: `1px solid ${info.colour}30`,
      }}
    >
      {stat}
      {showLabel && <span className="opacity-70">{info.label}</span>}
    </span>
  );
}
