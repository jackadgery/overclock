"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getQuests, getProfile, getStats, getQuestLogsForQuest } from "@/lib/db";
import { completeQuest } from "@/lib/quest-actions";
import { StatBadge } from "@/components/stat-badge";
import { TIER_XP_RANGES, type Quest, type Profile, type Stat } from "@/lib/types";

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ questName: string; xp: number } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [q, p, s] = await Promise.all([getQuests(), getProfile(), getStats()]);
      setQuests(q);
      setProfile(p);
      setStats(s);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleQuickComplete(quest: Quest) {
    if (completing) return;
    setCompleting(quest.id);
    setLastResult(null);

    try {
      const recentLogs = await getQuestLogsForQuest(quest.id, 14);
      const sameIntensityCount = recentLogs.length;

      const result = await completeQuest({
        quest,
        profile: profile!,
        stats,
        sameIntensityCount,
      });

      setLastResult({ questName: quest.name, xp: result.xpEarned });
      await loadData();
    } catch (err) {
      console.error("Failed to complete quest:", err);
    } finally {
      setCompleting(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs text-neutral-500">
          Loading mission registry...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="font-mono">
            <div className="text-xs text-oc-cyan/50 mb-1">
              SYS.MISSIONS // ACTIVE DIRECTIVES
            </div>
            <h1 className="text-lg font-bold text-oc-cyan tracking-wider">
              MISSIONS
            </h1>
          </div>
          <Link
            href="/quests/new"
            className="text-xs font-mono text-oc-cyan border border-oc-cyan/50 bg-oc-cyan/10 px-3 py-1.5 rounded hover:bg-oc-cyan/20 transition-colors uppercase tracking-wider"
          >
            + New
          </Link>
        </div>

        {/* XP flash notification */}
        {lastResult && (
          <div className="mb-4 p-3 rounded border border-oc-green/30 bg-oc-green/5 font-mono text-xs animate-pulse">
            <span className="text-oc-green">MISSION CONFIRMED</span>
            <span className="text-neutral-400"> — {lastResult.questName}</span>
            <span className="text-oc-amber ml-2">+{lastResult.xp} XP</span>
          </div>
        )}

        {/* Quest list */}
        {quests.length === 0 ? (
          <div className="text-center py-12 font-mono text-sm text-neutral-500">
            <div className="mb-2">No active missions.</div>
            <Link
              href="/quests/new"
              className="text-oc-cyan hover:underline"
            >
              Deploy your first mission →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {quests.map((quest) => (
              <div
                key={quest.id}
                className="border border-oc-border rounded-lg p-3 bg-oc-surface/50 hover:border-neutral-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatBadge stat={quest.stat} />
                      <span className="text-[10px] font-mono text-neutral-500 uppercase">
                        T{quest.difficulty_tier} · {TIER_XP_RANGES[quest.difficulty_tier].label}
                      </span>
                    </div>
                    <div className="font-mono text-sm text-neutral-200 truncate">
                      {quest.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-oc-amber">
                        {quest.base_xp} XP
                      </span>
                      <span className="text-[10px] font-mono text-neutral-600">
                        {quest.quest_type} · {quest.logging_mode}
                      </span>
                    </div>
                    {quest.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {quest.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-mono text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  {quest.logging_mode === "quick" ? (
                    <button
                      onClick={() => handleQuickComplete(quest)}
                      disabled={completing === quest.id}
                      className={`shrink-0 w-12 h-12 rounded-lg border font-mono text-xs uppercase tracking-wider transition-all ${
                        completing === quest.id
                          ? "border-oc-amber/50 bg-oc-amber/10 text-oc-amber"
                          : "border-oc-green/50 bg-oc-green/5 text-oc-green hover:bg-oc-green/15 hover:border-oc-green active:scale-95"
                      }`}
                    >
                      {completing === quest.id ? "..." : "✓"}
                    </button>
                  ) : (
                    <Link
                      href={`/quests/log?quest=${quest.id}`}
                      className="shrink-0 w-12 h-12 rounded-lg border border-oc-cyan/50 bg-oc-cyan/5 flex items-center justify-center font-mono text-[10px] text-oc-cyan uppercase hover:bg-oc-cyan/15 hover:border-oc-cyan active:scale-95 transition-all"
                    >
                      Log
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
