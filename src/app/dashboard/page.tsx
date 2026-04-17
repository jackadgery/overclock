"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile, getStats, getQuestLogs, getQuests, getTodayMoodLog, getMoodLogs, getUnlockedNodeNames, getStreakHistory, getActiveSpec } from "@/lib/db";
import { evaluateStreak } from "@/lib/streak";
import { xpProgress } from "@/lib/xp";
import {
  STAT_INFO,
  type Profile,
  type Stat,
  type QuestLog,
  type Quest,
  type StatName,
} from "@/lib/types";
import { LogoutButton } from "./logout-button";
import { RadarChart } from "@/components/radar-chart";
import { XpBar } from "@/components/xp-bar";
import { TodayStats } from "@/components/today-stats";
import { StreakBanner } from "@/components/streak-banner";
import { MoodGrid } from "@/components/mood-grid";
import { DiagnosticLoading, DiagnosticError } from "@/components/diagnostic-panel";
import { AchievementToast } from "@/components/achievement-toast";
import Link from "next/link";
import type { AchievementDef } from "@/lib/achievements";

const STAT_ORDER: StatName[] = ["STR", "END", "DEX", "INT", "WIS", "CHA"];

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [recentLogs, setRecentLogs] = useState<QuestLog[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [streakMessage, setStreakMessage] = useState<string | null>(null);
  const [showMoodGrid, setShowMoodGrid] = useState(false);
  const [showDiagnosticMood, setShowDiagnosticMood] = useState(false);
  const [diagnosticState, setDiagnosticState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [toastAchievements, setToastAchievements] = useState<AchievementDef[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [p, s, logs, q, todayMood] = await Promise.all([
          getProfile(),
          getStats(),
          getQuestLogs(50),
          getQuests(),
          getTodayMoodLog().catch(() => null),
        ]);

        // Evaluate streak on dashboard load
        const evalResult = await evaluateStreak(p);
        if (evalResult.message) {
          setStreakMessage(evalResult.message);
        }
        if (evalResult.newlyUnlockedAchievements?.length > 0) {
          setToastAchievements(evalResult.newlyUnlockedAchievements);
        }

        // Reload profile after streak evaluation (may have changed)
        if (evalResult.streakBroken || evalResult.freezeUsed) {
          const updatedProfile = await getProfile();
          setProfile(updatedProfile);
        } else {
          setProfile(p);
        }

        setStats(s);
        setRecentLogs(logs);
        setQuests(q);
        if (!todayMood) setShowMoodGrid(true);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        if (err instanceof Error && err.message === "Not authenticated") {
          window.location.replace("/login");
          return;
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs text-neutral-500 animate-pulse">
          Initialising system diagnostics...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs text-oc-magenta">
          SYS.ERR: Profile not found
        </div>
      </div>
    );
  }

  const charProgress = xpProgress(profile.total_xp);
  const sortedStats = STAT_ORDER.map(
    (name) => stats.find((s) => s.stat_name === name)!
  ).filter(Boolean);

  const maxStat = sortedStats.reduce((a, b) => (a.level > b.level ? a : b));
  const minStat = sortedStats.reduce((a, b) => (a.level < b.level ? a : b));

  // Type assertion for streak_freezes since it was added in Phase 4
  const freezes = (profile as Profile & { streak_freezes?: number }).streak_freezes ?? 0;

  // Step 1: button press → show mood recalibration grid
  function handleRunDiagnostic() {
    setShowDiagnosticMood(true);
  }

  // Step 2: after mood logged → run AI and navigate to Missions
  async function runDiagnosticAI() {
    setDiagnosticState("loading");
    try {
      const [moodLogs, unlockedNodes, streakHistory, activeSpec] = await Promise.all([
        getMoodLogs(5),
        getUnlockedNodeNames(),
        getStreakHistory(3),
        getActiveSpec(),
      ]);

      // Build diminishing returns flags: quests completed 5+ times in recent logs
      const completionCounts: Record<string, number> = {};
      for (const log of recentLogs) {
        completionCounts[log.quest_id] = (completionCounts[log.quest_id] ?? 0) + 1;
      }
      const diminishingReturns = Object.entries(completionCounts)
        .filter(([, count]) => count >= 5)
        .map(([questId, count]) => ({
          quest_name: quests.find((q) => q.id === questId)?.name ?? questId,
          completions_last_14: count,
        }));

      const now = new Date();
      const payload = {
        stats: sortedStats.map((s) => ({
          stat_name: s.stat_name,
          level: s.level,
          current_xp: s.current_xp,
          total_xp: s.total_xp,
        })),
        quests: quests.map((q) => ({
          name: q.name,
          stat: q.stat,
          difficulty_tier: q.difficulty_tier,
          base_xp: q.base_xp,
          logging_mode: q.logging_mode,
          tags: q.tags,
        })),
        recentCompletions: recentLogs.slice(0, 20).map((log) => ({
          quest_name: quests.find((q) => q.id === log.quest_id)?.name ?? "Unknown",
          stat: quests.find((q) => q.id === log.quest_id)?.stat ?? "STR",
          completed_at: log.completed_at,
          xp_earned: log.xp_earned,
        })),
        streak: {
          days: profile!.streak_days,
          multiplier: profile!.streak_multiplier,
        },
        mood: moodLogs.map((m) => ({
          energy: m.energy,
          motivation: m.motivation,
          was_skipped: m.was_skipped,
          logged_at: m.logged_at,
        })),
        diminishingReturns,
        unlockedNodes: Array.from(unlockedNodes),
        streakHistory: streakHistory.map((h) => ({
          max_days: h.max_days,
          death_tax_applied: h.death_tax_applied,
          streak_end: h.streak_end,
        })),
        activeSpec: activeSpec
          ? {
              spec_name: activeSpec.spec_name,
              focus_areas: activeSpec.focus_areas as string[],
              primary_stats: activeSpec.primary_stats as string[],
              days_active: Math.floor(
                (Date.now() - new Date(activeSpec.activated_at).getTime()) / (1000 * 60 * 60 * 24)
              ),
              respec_token_available: activeSpec.respec_token_available,
            }
          : null,
        timeContext: {
          hour: now.getHours(),
          dayOfWeek: now.toLocaleDateString("en-AU", { weekday: "long" }),
        },
      };

      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDiagnosticState("idle");
      router.push("/quests");
    } catch (err) {
      console.error("Diagnostic failed:", err);
      setDiagnosticState("error");
    }
  }

  return (
    <>
    {toastAchievements.length > 0 && (
      <AchievementToast
        achievements={toastAchievements}
        onDismiss={() => setToastAchievements([])}
      />
    )}
    {showMoodGrid && <MoodGrid onDone={() => setShowMoodGrid(false)} />}
    {showDiagnosticMood && (
      <MoodGrid
        onDone={() => {
          setShowDiagnosticMood(false);
          runDiagnosticAI();
        }}
      />
    )}
    {diagnosticState === "loading" && <DiagnosticLoading />}
    {diagnosticState === "error" && (
      <DiagnosticError onDone={() => setDiagnosticState("idle")} />
    )}
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="font-mono">
            <div className="text-xs text-oc-cyan/50 mb-0.5">
              SYS.CORE // MAIN DIAGNOSTIC
            </div>
            <h1 className="text-lg font-bold text-oc-cyan tracking-wider">
              OVERCLOCK
            </h1>
            {profile.active_title && (
              <div className="text-[10px] text-oc-amber mt-0.5">
                «{profile.active_title}»
              </div>
            )}
          </div>
          <LogoutButton />
        </div>

        {/* Streak banner (warnings, death tax, freezes) */}
        <StreakBanner profile={profile} evalMessage={streakMessage} />

        {/* Level + Streak row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* System Level */}
          <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/50">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
              System Level
            </div>
            <div className="text-3xl font-bold font-mono text-oc-cyan leading-none">
              {profile.character_level}
            </div>
            <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-oc-cyan rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, (charProgress.current / charProgress.required) * 100)}%`,
                  boxShadow: "0 0 8px rgba(0, 240, 255, 0.4)",
                }}
              />
            </div>
            <div className="text-[10px] font-mono text-neutral-600 mt-1">
              {charProgress.current.toLocaleString()} /{" "}
              {charProgress.required.toLocaleString()} XP
            </div>
          </div>

          {/* Streak */}
          <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/50">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
              Uptime Streak
            </div>
            <div className="text-3xl font-bold font-mono text-oc-green leading-none">
              {profile.streak_days}
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-[10px] font-mono text-neutral-600">
                Multiplier{" "}
                <span className="text-oc-amber font-bold">
                  {profile.streak_multiplier}×
                </span>
              </div>
              <div className="text-[10px] font-mono text-neutral-600">
                Freezes{" "}
                <span className="text-oc-cyan">
                  {freezes}/{2}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Today's output */}
        <div className="mb-4">
          <TodayStats logs={recentLogs} quests={quests} />
        </div>

        {/* Radar Chart */}
        <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/50 mb-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
            Subsystem Map
          </div>
          <RadarChart stats={stats} size={260} />
          {maxStat.level > minStat.level && (
            <div className="text-[10px] font-mono text-neutral-500 text-center mt-1">
              <span style={{ color: STAT_INFO[maxStat.stat_name].colour }}>
                {maxStat.stat_name}
              </span>
              {" leads · "}
              <span style={{ color: STAT_INFO[minStat.stat_name].colour }}>
                {minStat.stat_name}
              </span>
              {" needs work"}
            </div>
          )}
        </div>

        {/* Stat bars */}
        <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/50 mb-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-3">
            Subsystem Detail
          </div>
          <div className="space-y-3">
            {sortedStats.map((stat) => (
              <XpBar
                key={stat.id}
                statName={stat.stat_name}
                level={stat.level}
                currentXp={stat.current_xp}
                totalXp={stat.total_xp}
              />
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/50 mb-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
            Mission Log
          </div>
          {recentLogs.length === 0 ? (
            <div className="text-xs font-mono text-neutral-600 py-2">
              No missions completed yet.{" "}
              <Link href="/quests" className="text-oc-cyan hover:underline">
                View missions →
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentLogs.slice(0, 8).map((log) => {
                const quest = quests.find((q) => q.id === log.quest_id);
                const statInfo = quest ? STAT_INFO[quest.stat] : null;
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-xs font-mono py-0.5"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {statInfo && (
                        <span
                          className="text-[10px] font-bold w-7 shrink-0"
                          style={{ color: statInfo.colour }}
                        >
                          {quest!.stat}
                        </span>
                      )}
                      <span className="text-neutral-400 truncate">
                        {quest?.name || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-neutral-600 text-[10px]">
                        {new Date(log.completed_at).toLocaleDateString(
                          "en-AU",
                          {
                            day: "numeric",
                            month: "short",
                          }
                        )}
                      </span>
                      <span className="text-oc-amber w-14 text-right">
                        +{log.xp_earned}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/quests"
            className="border border-oc-border rounded-lg p-3 bg-oc-surface/50 hover:border-oc-cyan/30 transition-colors text-center"
          >
            <div className="text-lg mb-1">⬡</div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
              Missions
            </div>
          </Link>
          <button
            onClick={handleRunDiagnostic}
            disabled={diagnosticState === "loading"}
            className="border border-oc-border rounded-lg p-3 bg-oc-surface/50 hover:border-oc-cyan/30 transition-colors text-center disabled:opacity-40 disabled:cursor-not-allowed w-full"
          >
            <div className="text-lg mb-1">◇</div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
              Run Diagnostic
            </div>
          </button>
        </div>

        {/* Total XP footer */}
        <div className="text-center mt-6 mb-2">
          <div className="text-[10px] font-mono text-neutral-600">
            TOTAL SYSTEM XP: {profile.total_xp.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
