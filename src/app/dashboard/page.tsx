"use client";

import { useState, useEffect } from "react";
import { getProfile, getStats, getQuestLogs } from "@/lib/db";
import { xpProgress } from "@/lib/xp";
import { STAT_INFO, type Profile, type Stat, type QuestLog, type StatName } from "@/lib/types";
import { LogoutButton } from "./logout-button";
import Link from "next/link";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [recentLogs, setRecentLogs] = useState<QuestLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, s, logs] = await Promise.all([
          getProfile(),
          getStats(),
          getQuestLogs(10),
        ]);
        setProfile(p);
        setStats(s);
        setRecentLogs(logs);
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
        <div className="font-mono text-xs text-neutral-500">
          Loading system diagnostics...
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

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="font-mono">
            <div className="text-xs text-oc-cyan/50 mb-1">
              SYS.CORE // MAIN DIAGNOSTIC
            </div>
            <h1 className="text-lg font-bold text-oc-cyan tracking-wider">
              OVERCLOCK
            </h1>
          </div>
          <LogoutButton />
        </div>

        {/* Character level + streak */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/50">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
              System Level
            </div>
            <div className="text-2xl font-bold font-mono text-oc-cyan">
              {profile.character_level}
            </div>
            <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-oc-cyan rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (charProgress.current / charProgress.required) * 100)}%`,
                }}
              />
            </div>
            <div className="text-[10px] font-mono text-neutral-600 mt-1">
              {charProgress.current} / {charProgress.required} XP
            </div>
          </div>

          <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/50">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
              Uptime Streak
            </div>
            <div className="text-2xl font-bold font-mono text-oc-green">
              {profile.streak_days}
              <span className="text-sm text-neutral-500 ml-1">days</span>
            </div>
            <div className="text-[10px] font-mono text-neutral-600 mt-3">
              Multiplier:{" "}
              <span className="text-oc-amber">{profile.streak_multiplier}×</span>
            </div>
          </div>
        </div>

        {/* Stat readouts */}
        <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/50 mb-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-3">
            Subsystem Status
          </div>
          <div className="space-y-2.5">
            {stats
              .sort((a, b) => {
                const order: StatName[] = ["STR", "END", "DEX", "INT", "WIS", "CHA"];
                return order.indexOf(a.stat_name) - order.indexOf(b.stat_name);
              })
              .map((stat) => {
                const info = STAT_INFO[stat.stat_name];
                const progress = xpProgress(stat.total_xp);
                const pct = Math.min(
                  100,
                  (stat.current_xp / (progress.required || 1)) * 100
                );
                return (
                  <div key={stat.id}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-mono font-bold w-8"
                          style={{ color: info.colour }}
                        >
                          {stat.stat_name}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {info.label}
                        </span>
                      </div>
                      <div className="text-xs font-mono" style={{ color: info.colour }}>
                        Lv.{stat.level}
                      </div>
                    </div>
                    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: info.colour,
                          boxShadow: `0 0 6px ${info.colour}40`,
                        }}
                      />
                    </div>
                    <div className="text-[9px] font-mono text-neutral-600 mt-0.5">
                      {stat.current_xp} / {progress.required} XP
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/50 mb-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
            Recent Activity
          </div>
          {recentLogs.length === 0 ? (
            <div className="text-xs font-mono text-neutral-600 py-2">
              No missions completed yet.{" "}
              <Link href="/quests" className="text-oc-cyan hover:underline">
                View missions →
              </Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-xs font-mono"
                >
                  <span className="text-neutral-400 truncate flex-1">
                    {new Date(log.completed_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-oc-amber ml-2">+{log.xp_earned} XP</span>
                </div>
              ))}
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
          <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/30 text-center opacity-40">
            <div className="text-lg mb-1">◇</div>
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
              Diagnostics
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
