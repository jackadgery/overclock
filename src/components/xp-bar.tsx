"use client";

import { STAT_INFO, type StatName } from "@/lib/types";
import { xpProgress } from "@/lib/xp";

interface XpBarProps {
  statName: StatName;
  level: number;
  currentXp: number;
  totalXp: number;
}

export function XpBar({ statName, level, currentXp, totalXp }: XpBarProps) {
  const info = STAT_INFO[statName];
  const progress = xpProgress(totalXp);
  const pct = Math.min(100, (currentXp / (progress.required || 1)) * 100);

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-mono font-bold w-8"
            style={{ color: info.colour }}
          >
            {statName}
          </span>
          <span className="text-[10px] font-mono text-neutral-500 hidden group-hover:inline transition-opacity">
            {info.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-neutral-600">
            {currentXp}/{progress.required}
          </span>
          <span
            className="text-xs font-mono font-bold min-w-[3rem] text-right"
            style={{ color: info.colour }}
          >
            Lv.{level}
          </span>
        </div>
      </div>
      <div className="h-2 bg-neutral-800/80 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out relative"
          style={{
            width: `${pct}%`,
            backgroundColor: info.colour,
            boxShadow: `0 0 8px ${info.colour}50, inset 0 1px 0 rgba(255,255,255,0.15)`,
          }}
        >
          {/* Pulse effect on the leading edge */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 rounded-full animate-pulse"
            style={{
              backgroundColor: info.colour,
              boxShadow: `0 0 12px ${info.colour}80`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
