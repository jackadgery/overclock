import { createClient } from "@/lib/supabase/client";
import { calculateXp, xpProgress, xpRequiredForLevel } from "@/lib/xp";
import type { Quest, Profile, Stat, StatName } from "@/lib/types";

interface CompleteQuestInput {
  quest: Quest;
  profile: Profile;
  stats: Stat[];
  sameIntensityCount: number;
  /** For detailed logging */
  actualTonnage?: number;
  baselineTonnage?: number;
  /** Volume data JSON for detailed logging */
  volumeData?: Record<string, unknown>;
}

interface CompleteQuestResult {
  xpEarned: number;
  statLevelUp: boolean;
  newStatLevel: number;
  characterLevelUp: boolean;
  newCharacterLevel: number;
}

export async function completeQuest(
  input: CompleteQuestInput
): Promise<CompleteQuestResult> {
  const supabase = createClient();
  const { quest, profile, stats, sameIntensityCount } = input;

  // Find the relevant stat
  const stat = stats.find((s) => s.stat_name === quest.stat);
  if (!stat) throw new Error(`Stat ${quest.stat} not found`);

  // Calculate XP
  const xpResult = calculateXp({
    baseXp: quest.base_xp,
    streakDays: profile.streak_days,
    sameIntensityCount,
    actualTonnage: input.actualTonnage,
    baselineTonnage: input.baselineTonnage ?? stat.baseline_tonnage ?? undefined,
  });

  // Check for stat level-up
  const oldStatLevel = stat.level;
  let newStatXp = stat.current_xp + xpResult.finalXp;
  let newStatTotalXp = stat.total_xp + xpResult.finalXp;
  let newStatLevel = stat.level;
  let statLevelUp = false;

  // Process level-ups (could be multiple)
  while (newStatXp >= xpRequiredForLevel(newStatLevel + 1)) {
    newStatXp -= xpRequiredForLevel(newStatLevel + 1);
    newStatLevel++;
    statLevelUp = true;
  }

  // Check for character level-up
  const newProfileTotalXp = profile.total_xp + xpResult.finalXp;
  const oldCharLevel = profile.character_level;
  let newCharLevel = oldCharLevel;
  let charXpAccum = 0;

  // Recalculate character level from scratch using total XP across all stats
  const allStatTotalXps = stats.map((s) =>
    s.stat_name === quest.stat ? newStatTotalXp : s.total_xp
  );
  const aggregateXp = allStatTotalXps.reduce((sum, xp) => sum + xp, 0);

  // Simple level calculation from aggregate
  let cumXp = 0;
  newCharLevel = 0;
  while (true) {
    const next = Math.floor(100 * Math.pow(newCharLevel + 1, 1.5));
    if (cumXp + next > aggregateXp) break;
    cumXp += next;
    newCharLevel++;
  }
  if (newCharLevel < 1) newCharLevel = 1;

  const characterLevelUp = newCharLevel > oldCharLevel;

  // Write quest log
  const { error: logError } = await supabase.from("quest_logs").insert({
    quest_id: quest.id,
    profile_id: profile.id,
    xp_earned: xpResult.finalXp,
    xp_base: quest.base_xp,
    multiplier_applied:
      xpResult.volumeMultiplier *
      xpResult.streakMultiplier *
      xpResult.decayFactor *
      xpResult.specMultiplier,
    streak_multiplier: xpResult.streakMultiplier,
    decay_factor: xpResult.decayFactor,
    volume_data: input.volumeData ?? null,
  });
  if (logError) throw logError;

  // Update stat
  const { error: statError } = await supabase
    .from("stats")
    .update({
      current_xp: newStatXp,
      total_xp: newStatTotalXp,
      level: newStatLevel,
      skill_points_available: stat.skill_points_available + (newStatLevel - oldStatLevel),
    })
    .eq("id", stat.id);
  if (statError) throw statError;

  // Update profile
  const today = new Date().toISOString().split("T")[0];
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      total_xp: newProfileTotalXp,
      character_level: newCharLevel,
      last_active_date: today,
    })
    .eq("id", profile.id);
  if (profileError) throw profileError;

  return {
    xpEarned: xpResult.finalXp,
    statLevelUp,
    newStatLevel,
    characterLevelUp,
    newCharacterLevel: newCharLevel,
  };
}
