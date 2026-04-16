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
      const result = await completeQuest({
        quest,
        profile: profile!,
        stats,
        sameIntensityCount: recentLogs.length,
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
        <div className="font-mono text-xs text-neutral-500 animate-pulse">
          Loading directives...
        </div>
      </div>
    );
  }

  const directives = quests.filter((q) => q.tags.includes("ai"));
  const routines = quests.filter((q) => !q.tags.includes("ai"));

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="font-mono">
            <div className="text-xs text-oc-cyan/50 mb-1">
              SYS.MISSIONS // ACTIVE
            </div>
            <h1 className="text-lg font-bold text-oc-cyan tracking-wider">
              MISSIONS
            </h1>
          </div>
          <Link
            href="/quests/new"
            className="text-[10px] font-mono text-oc-amber border border-oc-amber/40 bg-oc-amber/5 px-3 py-1.5 rounded hover:bg-oc-amber/10 transition-colors uppercase tracking-wider"
          >
            + Routine
          </Link>
        </div>

        {/* XP flash */}
        {lastResult && (
          <div className="mb-4 p-3 rounded border border-oc-green/30 bg-oc-green/5 font-mono text-xs">
            <span className="text-oc-green">CONFIRMED</span>
            <span className="text-neutral-400"> — {lastResult.questName}</span>
            <span className="text-oc-amber ml-2">+{lastResult.xp} XP</span>
          </div>
        )}

        {/* DIRECTIVES */}
        <div className="mb-6">
          <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mb-2">
            Directives
          </div>
          {directives.length === 0 ? (
            <div className="border border-oc-border rounded-lg p-4 bg-oc-surface/20 text-center">
              <div className="text-[10px] font-mono text-neutral-700 mb-1">
                No directives loaded
              </div>
              <Link
                href="/dashboard"
                className="text-[10px] font-mono text-oc-cyan/50 hover:text-oc-cyan transition-colors uppercase tracking-wider"
              >
                Run Diagnostic from CORE →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {directives.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  completing={completing}
                  onQuickComplete={handleQuickComplete}
                  showReasoning
                />
              ))}
            </div>
          )}
        </div>

        {/* ROUTINES */}
        <div>
          <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mb-2">
            Routines
          </div>
          {routines.length === 0 ? (
            <div className="border border-oc-border rounded-lg p-4 bg-oc-surface/20 text-center">
              <div className="text-[10px] font-mono text-neutral-700 mb-1">
                No routines defined
              </div>
              <Link
                href="/quests/new"
                className="text-[10px] font-mono text-oc-amber/50 hover:text-oc-amber transition-colors uppercase tracking-wider"
              >
                Add a routine →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {routines.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  completing={completing}
                  onQuickComplete={handleQuickComplete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface QuestCardProps {
  quest: Quest;
  completing: string | null;
  onQuickComplete: (quest: Quest) => void;
  showReasoning?: boolean;
}

function QuestCard({ quest, completing, onQuickComplete, showReasoning }: QuestCardProps) {
  return (
    <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/50 hover:border-neutral-600 transition-colors">
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
          {showReasoning && quest.notes && (
            <div className="text-[10px] font-mono text-neutral-600 mt-1 leading-relaxed line-clamp-2">
              {quest.notes}
            </div>
          )}
          {!showReasoning && quest.tags.length > 0 && (
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
          <div className="mt-1">
            <span className="text-[10px] font-mono text-oc-amber">
              {quest.base_xp} XP
            </span>
          </div>
        </div>

        {/* Action */}
        {quest.logging_mode === "quick" ? (
          <button
            onClick={() => onQuickComplete(quest)}
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
  );
}
