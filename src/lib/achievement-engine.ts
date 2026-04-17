import {
  ACHIEVEMENT_DEFS,
  type AchievementDef,
} from "@/lib/achievements";
import {
  getUnlockedAchievementKeys,
  unlockAchievements,
  getTotalQuestCount,
  getTodayQuestStats,
  getStreakBreakHistory,
} from "@/lib/db";
import type { StatName } from "@/lib/types";

// ── Quest completion achievements ─────────────────────────────────────────────

interface QuestCompletionContext {
  stat: StatName;
  decayFactor: number;
  newStatLevel: number;
  allStats: Array<{ stat_name: StatName; level: number }>;
  xpEarned: number;
  hourOfDay: number;
  newCharLevel: number;
}

export async function checkAndAwardQuestAchievements(
  ctx: QuestCompletionContext
): Promise<AchievementDef[]> {
  const [alreadyUnlocked, totalCount, todayStats] = await Promise.all([
    getUnlockedAchievementKeys(),
    getTotalQuestCount(),
    getTodayQuestStats(),
  ]);

  const toUnlock: Array<{ key: string; xp_bonus: number }> = [];
  const triggered: AchievementDef[] = [];

  function consider(key: string) {
    if (alreadyUnlocked.has(key)) return;
    const def = ACHIEVEMENT_DEFS.find((a) => a.key === key);
    if (!def) return;
    toUnlock.push({ key, xp_bonus: def.xp_bonus });
    triggered.push(def);
    alreadyUnlocked.add(key); // prevent double-fire within same call
  }

  // ── Quest count milestones ──────────────────────────────────────────────
  if (totalCount === 1) consider("first_blood");
  if (totalCount === 100) consider("century");
  if (totalCount === 500) consider("half_millennium");
  if (totalCount === 1000) consider("the_thousand");

  // ── Stat level milestones ───────────────────────────────────────────────
  if (ctx.newStatLevel >= 10) consider("decathlon");
  if (ctx.newStatLevel >= 50) consider("max_level_any");

  // ── Character level ─────────────────────────────────────────────────────
  if (ctx.newCharLevel >= 100) consider("grandmaster");

  // ── All-stat milestones ─────────────────────────────────────────────────
  const levels = ctx.allStats.map((s) => s.level);
  if (levels.every((l) => l >= 5)) consider("well_rounded");
  if (levels.every((l) => l >= 10)) consider("balanced_force");
  if (levels.every((l) => l >= 25)) consider("perfectionist");

  // Hidden: all stats within 3 levels, all >= 15
  if (levels.every((l) => l >= 15)) {
    const min = Math.min(...levels);
    const max = Math.max(...levels);
    if (max - min <= 3) consider("the_balanced");
  }

  // ── Time of day ─────────────────────────────────────────────────────────
  if (ctx.hourOfDay < 6) consider("dawn_warrior");
  if (ctx.hourOfDay >= 23) consider("night_owl");

  // ── Today's breadth ─────────────────────────────────────────────────────
  const statsDoneToday = todayStats.statsCompleted.size;
  if (statsDoneToday >= 2) consider("double_tap");
  if (statsDoneToday >= 5) consider("pentathlon");
  if (statsDoneToday >= 6) consider("full_sweep");

  // ── Today's volume ──────────────────────────────────────────────────────
  if (todayStats.questCount >= 8) consider("marathon_session");

  // ── Diminishing returns floor ───────────────────────────────────────────
  if (ctx.decayFactor <= 0.25) consider("the_grind");

  if (toUnlock.length > 0) {
    await unlockAchievements(toUnlock);
  }

  return triggered;
}

// ── Streak milestone achievements ─────────────────────────────────────────────

const STREAK_KEYS: Record<number, string> = {
  7: "streak_7",
  14: "streak_14",
  30: "streak_30",
  60: "streak_60",
  90: "streak_90",
  180: "streak_180",
  365: "streak_365",
};

export async function checkAndAwardStreakAchievements(
  newStreakDays: number
): Promise<AchievementDef[]> {
  const milestoneKey = STREAK_KEYS[newStreakDays];
  const checkPhoenix = newStreakDays === 14 || newStreakDays === 30;

  if (!milestoneKey && !checkPhoenix) return [];

  const alreadyUnlocked = await getUnlockedAchievementKeys();
  const toUnlock: Array<{ key: string; xp_bonus: number }> = [];
  const triggered: AchievementDef[] = [];

  function consider(key: string) {
    if (alreadyUnlocked.has(key)) return;
    const def = ACHIEVEMENT_DEFS.find((a) => a.key === key);
    if (!def) return;
    toUnlock.push({ key, xp_bonus: def.xp_bonus });
    triggered.push(def);
    alreadyUnlocked.add(key);
  }

  if (milestoneKey) consider(milestoneKey);

  // Phoenix: rebuilding after a previous death tax
  if (checkPhoenix) {
    const history = await getStreakBreakHistory();
    const hadDeathTax = history.some((h) => h.death_tax_applied > 0);
    if (hadDeathTax) {
      if (newStreakDays === 14) consider("phoenix");
      if (newStreakDays === 30) consider("phoenix_rising");
    }
  }

  if (toUnlock.length > 0) {
    await unlockAchievements(toUnlock);
  }

  return triggered;
}

// ── Streak break achievements ─────────────────────────────────────────────────

export async function checkAndAwardBreakAchievements(
  brokenStreakDays: number
): Promise<AchievementDef[]> {
  const alreadyUnlocked = await getUnlockedAchievementKeys();
  const toUnlock: Array<{ key: string; xp_bonus: number }> = [];
  const triggered: AchievementDef[] = [];

  function consider(key: string) {
    if (alreadyUnlocked.has(key)) return;
    const def = ACHIEVEMENT_DEFS.find((a) => a.key === key);
    if (!def) return;
    toUnlock.push({ key, xp_bonus: def.xp_bonus });
    triggered.push(def);
    alreadyUnlocked.add(key);
  }

  // Rock Bottom: 60+ day streak broken
  if (brokenStreakDays >= 60) consider("rock_bottom");

  // Comeback Kid / Deathwalker: check total and consecutive death taxes
  // History is fetched after the break has already been inserted
  const history = await getStreakBreakHistory();
  const taxEntries = history.filter((h) => h.death_tax_applied > 0);

  if (taxEntries.length >= 3) consider("comeback_kid");

  // Deathwalker: last 3 tax events all had streaks < 30 days between them
  if (taxEntries.length >= 3) {
    const last3 = taxEntries.slice(0, 3);
    if (last3.every((h) => h.max_days < 30)) consider("deathwalker");
  }

  if (toUnlock.length > 0) {
    await unlockAchievements(toUnlock);
  }

  return triggered;
}
