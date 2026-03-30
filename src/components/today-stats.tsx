"use client";

import type { QuestLog, StatName, Quest } from "@/lib/types";
import { STAT_INFO } from "@/lib/types";

interface TodayStatsProps {
  logs: QuestLog[];
  quests: Quest[];
}

export function TodayStats({ logs, quests }: TodayStatsProps) {
  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter(
    (log) => log.completed_at.split("T")[0] === today
  );

  if (todayLogs.length === 0) {
    return (
      <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/50">
        <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
          Today&apos;s Output
        </div>
        <div className="text-xs font-mono text-neutral-600">
          No missions completed today.
        </div>
      </div>
    );
  }

  // Sum XP per stat for today
  const statXp: Partial<Record<StatName, number>> = {};
  let totalXpToday = 0;

  for (const log of todayLogs) {
    const quest = quests.find((q) => q.id === log.quest_id);
    if (quest) {
      statXp[quest.stat] = (statXp[quest.stat] || 0) + log.xp_earned;
    }
    totalXpToday += log.xp_earned;
  }

  return (
    <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
          Today&apos;s Output
        </div>
        <div className="text-xs font-mono text-oc-amber">
          +{totalXpToday} XP · {todayLogs.length} mission{todayLogs.length !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {(Object.entries(statXp) as [StatName, number][]).map(([stat, xp]) => {
          const info = STAT_INFO[stat];
          return (
            <div
              key={stat}
              className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded"
              style={{
                color: info.colour,
                backgroundColor: `${info.colour}10`,
                border: `1px solid ${info.colour}25`,
              }}
            >
              <span className="font-bold">{stat}</span>
              <span className="opacity-70">+{xp}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
