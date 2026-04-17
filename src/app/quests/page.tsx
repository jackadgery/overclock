"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getQuests, getProfile, getStats, getQuestLogsForQuest } from "@/lib/db";
import { completeQuest } from "@/lib/quest-actions";
import { AchievementToast } from "@/components/achievement-toast";
import { StatBadge } from "@/components/stat-badge";
import { TIER_XP_RANGES, type Quest, type Profile, type Stat } from "@/lib/types";
import type { AchievementDef } from "@/lib/achievements";

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ questName: string; xp: number } | null>(null);
  const [toastAchievements, setToastAchievements] = useState<AchievementDef[]>([]);

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
      if (result.newlyUnlockedAchievements.length > 0) {
        setToastAchievements(result.newlyUnlockedAchievements);
      }
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
  const ops = quests.filter(
    (q) => !q.tags.includes("ai") && (q.quest_type === "one_off" || q.quest_type === "timed")
  );
  const routines = quests.filter(
    (q) => !q.tags.includes("ai") && q.quest_type === "repeatable"
  );

  return (
    <>
      {toastAchievements.length > 0 && (
        <AchievementToast
          achievements={toastAchievements}
          onDismiss={() => setToastAchievements([])}
        />
      )}
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="font-mono">
            <div className="text-xs text-oc-cyan/50 mb-1">SYS.MISSIONS // ACTIVE</div>
            <h1 className="text-lg font-bold text-oc-cyan tracking-wider">MISSIONS</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/quests/new?t=op"
              className="text-[10px] font-mono text-oc-magenta border border-oc-magenta/40 bg-oc-magenta/5 px-2.5 py-1.5 rounded hover:bg-oc-magenta/10 transition-colors uppercase tracking-wider"
            >
              + Op
            </Link>
            <Link
              href="/quests/new?t=routine"
              className="text-[10px] font-mono text-oc-amber border border-oc-amber/40 bg-oc-amber/5 px-2.5 py-1.5 rounded hover:bg-oc-amber/10 transition-colors uppercase tracking-wider"
            >
              + Routine
            </Link>
          </div>
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
        <Section
          label="Directives"
          sublabel="AI-generated"
          accentClass="text-oc-cyan"
          borderStyle="border-l-oc-cyan/40"
        >
          {directives.length === 0 ? (
            <EmptyState
              message="No directives loaded"
              action="Run Diagnostic from CORE →"
              href="/dashboard"
            />
          ) : (
            directives.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                variant="directive"
                completing={completing}
                onQuickComplete={handleQuickComplete}
              />
            ))
          )}
        </Section>

        {/* OPS */}
        <Section
          label="Ops"
          sublabel="one-off tasks"
          accentClass="text-oc-magenta"
          borderStyle="border-l-oc-magenta/40"
        >
          {ops.length === 0 ? (
            <EmptyState
              message="No ops queued"
              action="+ Op →"
              href="/quests/new?t=op"
            />
          ) : (
            ops.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                variant="op"
                completing={completing}
                onQuickComplete={handleQuickComplete}
              />
            ))
          )}
        </Section>

        {/* ROUTINES */}
        <Section
          label="Routines"
          sublabel="repeatable"
          accentClass="text-oc-amber"
          borderStyle="border-l-oc-amber/40"
        >
          {routines.length === 0 ? (
            <EmptyState
              message="No routines defined"
              action="+ Routine →"
              href="/quests/new?t=routine"
            />
          ) : (
            routines.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                variant="routine"
                completing={completing}
                onQuickComplete={handleQuickComplete}
              />
            ))
          )}
        </Section>
      </div>
    </div>
    </>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

interface SectionProps {
  label: string;
  sublabel: string;
  accentClass: string;
  borderStyle: string;
  children: React.ReactNode;
}

function Section({ label, sublabel, accentClass, borderStyle, children }: SectionProps) {
  return (
    <div className="mb-7">
      <div className={`flex items-baseline gap-2 mb-2.5 pl-3 border-l-2 ${borderStyle}`}>
        <span className={`text-[11px] font-mono font-bold uppercase tracking-widest ${accentClass}`}>
          {label}
        </span>
        <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-wider">
          {sublabel}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ message, action, href }: { message: string; action: string; href: string }) {
  return (
    <div className="border border-oc-border rounded-lg p-4 bg-oc-surface/20 text-center">
      <div className="text-[10px] font-mono text-neutral-700 mb-1">{message}</div>
      <Link
        href={href}
        className="text-[10px] font-mono text-neutral-600 hover:text-neutral-400 transition-colors uppercase tracking-wider"
      >
        {action}
      </Link>
    </div>
  );
}

// ─── QuestCard ────────────────────────────────────────────────────────────────

type CardVariant = "directive" | "op" | "routine";

const VARIANT_STYLES: Record<CardVariant, {
  border: string;
  bg: string;
  accentBar: string;
  actionColor: string;
}> = {
  directive: {
    border: "border-oc-cyan/25 hover:border-oc-cyan/50",
    bg: "bg-oc-cyan/[0.03]",
    accentBar: "bg-oc-cyan/30",
    actionColor: "border-oc-green/50 bg-oc-green/5 text-oc-green hover:bg-oc-green/15 hover:border-oc-green",
  },
  op: {
    border: "border-oc-magenta/25 hover:border-oc-magenta/40",
    bg: "bg-oc-magenta/[0.02]",
    accentBar: "bg-oc-magenta/30",
    actionColor: "border-oc-green/50 bg-oc-green/5 text-oc-green hover:bg-oc-green/15 hover:border-oc-green",
  },
  routine: {
    border: "border-oc-amber/20 hover:border-oc-amber/40",
    bg: "bg-oc-amber/[0.02]",
    accentBar: "bg-oc-amber/30",
    actionColor: "border-oc-green/50 bg-oc-green/5 text-oc-green hover:bg-oc-green/15 hover:border-oc-green",
  },
};

interface QuestCardProps {
  quest: Quest;
  variant: CardVariant;
  completing: string | null;
  onQuickComplete: (quest: Quest) => void;
}

function QuestCard({ quest, variant, completing, onQuickComplete }: QuestCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${styles.border} ${styles.bg}`}>
      <div className="flex items-stretch">
        {/* Left accent bar */}
        <div className={`w-0.5 shrink-0 ${styles.accentBar}`} />

        <div className="flex-1 flex items-start justify-between gap-3 p-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatBadge stat={quest.stat} />
              <span className="text-[10px] font-mono text-neutral-500 uppercase">
                T{quest.difficulty_tier} · {TIER_XP_RANGES[quest.difficulty_tier].label}
              </span>
              {variant === "directive" && (
                <span className="text-[9px] font-mono text-oc-cyan/50 uppercase tracking-wider">
                  AI
                </span>
              )}
            </div>

            <div className="font-mono text-sm text-neutral-200 truncate">
              {quest.name}
            </div>

            {/* Directive: show full reasoning */}
            {variant === "directive" && quest.notes && (
              <div className="text-[10px] font-mono text-neutral-500 mt-1.5 leading-relaxed">
                {quest.notes}
              </div>
            )}

            {/* Ops/Routines: show tags */}
            {variant !== "directive" && quest.tags.filter((t) => t !== "ai").length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {quest.tags.filter((t) => t !== "ai").map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] font-mono text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {quest.deadline && (
              <div className="text-[10px] font-mono text-oc-magenta/70 mt-1">
                ⏱ {new Date(quest.deadline).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </div>
            )}

            <div className="mt-1.5">
              <span className="text-[10px] font-mono text-oc-amber">{quest.base_xp} XP</span>
            </div>
          </div>

          {/* Action button */}
          {quest.logging_mode === "quick" ? (
            <button
              onClick={() => onQuickComplete(quest)}
              disabled={completing === quest.id}
              className={`shrink-0 w-12 h-12 rounded-lg border font-mono text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 ${
                completing === quest.id
                  ? "border-oc-amber/50 bg-oc-amber/10 text-oc-amber"
                  : styles.actionColor
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
    </div>
  );
}
