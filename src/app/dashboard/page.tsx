"use client";

import { useState, useEffect } from "react";
import { getProfile, getStats, getQuestLogs, getQuests } from "@/lib/db";
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
import Link from "next/link";

const STAT_ORDER: StatName[] = ["STR", "END", "DEX", "INT", "WIS", "CHA"];

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [recentLogs, setRecentLogs] = useState<QuestLog[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [streakMessage, setStreakMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [p, s, logs, q] = await Promise.all([
          getProfile(),
          getStats(),
          getQuestLogs(50),
          getQuests(),
        ]);

        // Evaluate streak on dashboard load
        const evalResult = await evaluateStreak(p);
        if (evalResult.message) {
          setStreakMessage(evalResult.message);
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
      } catch (err) {
        console.error("Failed to load dashboard:", err);
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

  return (
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
          <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/30 text-center opacity-40 cursor-not-allowed">
            <div className="text-lg mb-1">◇</div>
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
              Run Diagnostic
            </div>
          </div>
        </div>

        {/* Total XP footer */}
        <div className="text-center mt-6 mb-2">
          <div className="text-[10px] font-mono text-neutral-600">
            TOTAL SYSTEM XP: {profile.total_xp.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
