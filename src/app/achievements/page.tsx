"use client";

import { useState, useEffect } from "react";
import { getAchievements, getStats, setActiveTitle, getProfile } from "@/lib/db";
import {
  ACHIEVEMENT_DEFS,
  ACHIEVEMENT_TITLE_MAP,
  getEarnedStatTitles,
  type AchievementDef,
} from "@/lib/achievements";
import type { Achievement, Stat, Profile, StatName } from "@/lib/types";

const CATEGORY_ORDER = ["milestone", "streak", "event", "recovery", "hidden"] as const;
const CATEGORY_LABELS: Record<string, { label: string; colour: string }> = {
  milestone: { label: "Milestones", colour: "text-oc-cyan" },
  streak:    { label: "Streak",     colour: "text-oc-green" },
  event:     { label: "Events",     colour: "text-oc-amber" },
  recovery:  { label: "Recovery",   colour: "text-oc-magenta" },
  hidden:    { label: "Classified", colour: "text-neutral-500" },
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingTitle, setSettingTitle] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [a, s, p] = await Promise.all([getAchievements(), getStats(), getProfile()]);
        setAchievements(a);
        setStats(s);
        setProfile(p);
      } catch (err) {
        console.error("Failed to load achievements:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSetTitle(title: string | null) {
    if (settingTitle !== null) return;
    setSettingTitle(title ?? "");
    try {
      await setActiveTitle(title);
      setProfile((p) => p ? { ...p, active_title: title } : p);
    } catch (err) {
      console.error("Failed to set title:", err);
    } finally {
      setSettingTitle(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs text-neutral-500 animate-pulse">
          Loading records...
        </div>
      </div>
    );
  }

  const unlockedKeys = new Set(achievements.map((a) => a.achievement_key));

  // Compute all earned titles
  const statTitles = getEarnedStatTitles(
    stats.map((s) => ({ stat_name: s.stat_name as StatName, level: s.level }))
  );
  const achievementTitles = achievements
    .map((a) => ACHIEVEMENT_TITLE_MAP[a.achievement_key])
    .filter(Boolean) as string[];
  const allTitles = [...new Set([...statTitles, ...achievementTitles])];
  const activeTitle = profile?.active_title ?? null;

  const totalXpFromAchievements = achievements.reduce((sum, a) => sum + a.xp_awarded, 0);

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-5 font-mono">
          <div className="text-xs text-oc-cyan/50 mb-1">SYS.RECORDS // ACHIEVEMENTS</div>
          <h1 className="text-lg font-bold text-oc-cyan tracking-wider">RECORDS</h1>
          <div className="text-[10px] text-neutral-600 mt-1">
            {unlockedKeys.size} / {ACHIEVEMENT_DEFS.length} unlocked ·{" "}
            <span className="text-oc-amber">{totalXpFromAchievements.toLocaleString()} XP</span> earned
          </div>
        </div>

        {/* Title Picker */}
        <div className="border border-oc-amber/20 rounded-lg p-4 mb-6 bg-oc-amber/[0.02]">
          <div className="text-[10px] font-mono text-oc-amber/60 uppercase tracking-widest mb-3">
            Active Title
          </div>

          {activeTitle ? (
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-mono font-bold text-oc-amber">
                «{activeTitle}»
              </div>
              <button
                onClick={() => handleSetTitle(null)}
                disabled={settingTitle !== null}
                className="text-[9px] font-mono text-neutral-600 hover:text-neutral-400 uppercase tracking-wider transition-colors disabled:cursor-not-allowed"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="text-xs font-mono text-neutral-600 mb-3">
              No title active
            </div>
          )}

          {allTitles.length === 0 ? (
            <div className="text-[10px] font-mono text-neutral-700">
              Unlock titles by reaching stat milestones or earning achievements.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allTitles.map((title) => {
                const isActive = title === activeTitle;
                return (
                  <button
                    key={title}
                    onClick={() => handleSetTitle(isActive ? null : title)}
                    disabled={settingTitle !== null}
                    className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-colors disabled:cursor-not-allowed ${
                      isActive
                        ? "border-oc-amber/60 bg-oc-amber/10 text-oc-amber"
                        : "border-neutral-700 bg-transparent text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
                    }`}
                  >
                    {title}
                    {isActive && (
                      <span className="ml-1 text-[8px] text-oc-amber/60">◈</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Achievement categories */}
        {CATEGORY_ORDER.map((cat) => {
          const defs = ACHIEVEMENT_DEFS.filter((a) => a.category === cat);
          const catInfo = CATEGORY_LABELS[cat];
          const unlockedInCat = defs.filter((a) => unlockedKeys.has(a.key)).length;

          return (
            <div key={cat} className="mb-6">
              <div className="flex items-baseline gap-2 mb-2.5">
                <span className={`text-[11px] font-mono font-bold uppercase tracking-widest ${catInfo.colour}`}>
                  {catInfo.label}
                </span>
                <span className="text-[9px] font-mono text-neutral-700">
                  {unlockedInCat}/{defs.length}
                </span>
              </div>

              <div className="space-y-2">
                {defs.map((def) => {
                  const unlock = achievements.find((a) => a.achievement_key === def.key);
                  const isUnlocked = !!unlock;

                  return (
                    <AchievementCard
                      key={def.key}
                      def={def}
                      isUnlocked={isUnlocked}
                      unlockedAt={unlock?.unlocked_at ?? null}
                      xpAwarded={unlock?.xp_awarded ?? null}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Achievement Card ──────────────────────────────────────────────────────────

function AchievementCard({
  def,
  isUnlocked,
  unlockedAt,
  xpAwarded,
}: {
  def: AchievementDef;
  isUnlocked: boolean;
  unlockedAt: string | null;
  xpAwarded: number | null;
}) {
  const isHiddenLocked = def.hidden && !isUnlocked;

  return (
    <div
      className={`border rounded-lg p-3 transition-colors ${
        isUnlocked
          ? "border-oc-amber/30 bg-oc-amber/[0.04]"
          : "border-neutral-800 bg-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-xs font-mono font-bold uppercase tracking-wider ${
                isUnlocked ? "text-oc-amber" : "text-neutral-600"
              }`}
            >
              {isHiddenLocked ? "???" : def.name}
            </span>
            {isUnlocked && (
              <span className="text-[9px] font-mono text-oc-amber/50">UNLOCKED</span>
            )}
            {def.hidden && !isUnlocked && (
              <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-wider">
                CLASSIFIED
              </span>
            )}
          </div>
          <div
            className={`text-[10px] font-mono leading-relaxed ${
              isUnlocked ? "text-neutral-400" : "text-neutral-700"
            }`}
          >
            {isUnlocked ? def.description : def.hint}
          </div>
          {isUnlocked && unlockedAt && (
            <div className="text-[9px] font-mono text-neutral-700 mt-1">
              {new Date(unlockedAt).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          {isUnlocked ? (
            <div>
              <div className="text-xs font-mono font-bold text-oc-amber">
                +{(xpAwarded ?? def.xp_bonus).toLocaleString()}
              </div>
              <div className="text-[9px] font-mono text-neutral-600">XP</div>
            </div>
          ) : (
            <div className="text-neutral-800 text-sm font-mono">
              {isHiddenLocked ? "?" : def.xp_bonus.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
