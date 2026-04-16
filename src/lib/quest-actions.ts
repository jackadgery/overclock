import { createClient } from "@/lib/supabase/client";
import { calculateXp, xpRequiredForLevel } from "@/lib/xp";
import { incrementStreak, checkAndAwardFreeze } from "@/lib/streak";
import { getUnlockedNodeNames, getUnlockedSpecNames, checkAndUnlockSpecialisations } from "@/lib/db";
import { computeNodeMultiplier, computeDrFloor, computeSpecMultiplier } from "@/lib/skill-tree";
import type { Quest, Profile, Stat } from "@/lib/types";

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
  streakIncremented: boolean;
  newStreakDays: number;
  newMultiplier: number;
  freezeAwarded: boolean;
  newlyUnlockedSpecs: string[];
}

export async function completeQuest(
  input: CompleteQuestInput
): Promise<CompleteQuestResult> {
  const supabase = createClient();
  const { quest, profile, stats, sameIntensityCount } = input;

  // Find the relevant stat
  const stat = stats.find((s) => s.stat_name === quest.stat);
  if (!stat) throw new Error(`Stat ${quest.stat} not found`);

  // Increment streak first (so the multiplier applies to this quest)
  const { newStreakDays, newMultiplier } = await incrementStreak(profile);

  // Check for freeze award
  const freezeAwarded = await checkAndAwardFreeze(profile.id, newStreakDays);

  // Fetch skill tree bonuses
  const [unlockedNodes, unlockedSpecs] = await Promise.all([
    getUnlockedNodeNames(),
    getUnlockedSpecNames(),
  ]);
  const nodeMultiplier = computeNodeMultiplier(unlockedNodes, quest.stat, quest.logging_mode);
  const drFloor = computeDrFloor(unlockedNodes, unlockedSpecs, quest.stat);
  const specMultiplier = computeSpecMultiplier(unlockedSpecs, quest.stat);

  // Calculate XP using the updated streak
  const xpResult = calculateXp({
    baseXp: quest.base_xp,
    streakDays: newStreakDays,
    sameIntensityCount,
    actualTonnage: input.actualTonnage,
    baselineTonnage: input.baselineTonnage ?? stat.baseline_tonnage ?? undefined,
    nodeMultiplier,
    drFloor,
    specMultiplier,
  });

  // Check for stat level-up
  const oldStatLevel = stat.level;
  let newStatXp = stat.current_xp + xpResult.finalXp;
  const newStatTotalXp = stat.total_xp + xpResult.finalXp;
  let newStatLevel = stat.level;
  let statLevelUp = false;

  // Process level-ups (could be multiple)
  while (newStatXp >= xpRequiredForLevel(newStatLevel + 1)) {
    newStatXp -= xpRequiredForLevel(newStatLevel + 1);
    newStatLevel++;
    statLevelUp = true;
  }

  // Character level from aggregate XP
  const newProfileTotalXp = profile.total_xp + xpResult.finalXp;
  const allStatTotalXps = stats.map((s) =>
    s.stat_name === quest.stat ? newStatTotalXp : s.total_xp
  );
  const aggregateXp = allStatTotalXps.reduce((sum, xp) => sum + xp, 0);

  let newCharLevel = 0;
  let cumXp = 0;
  while (true) {
    const next = Math.floor(100 * Math.pow(newCharLevel + 1, 1.5));
    if (cumXp + next > aggregateXp) break;
    cumXp += next;
    newCharLevel++;
  }
  if (newCharLevel < 1) newCharLevel = 1;

  const characterLevelUp = newCharLevel > profile.character_level;
  const streakIncremented = newStreakDays > profile.streak_days;

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
      skill_points_available:
        stat.skill_points_available + (newStatLevel - oldStatLevel),
    })
    .eq("id", stat.id);
  if (statError) throw statError;

  // Update profile (streak already updated by incrementStreak)
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      total_xp: newProfileTotalXp,
      character_level: newCharLevel,
    })
    .eq("id", profile.id);
  if (profileError) throw profileError;

  // Check for newly unlocked cross-stat specialisations
  const updatedStats = stats.map((s) =>
    s.stat_name === quest.stat ? { ...s, level: newStatLevel } : s
  );
  const newlyUnlockedSpecs = statLevelUp
    ? await checkAndUnlockSpecialisations(updatedStats)
    : [];

  return {
    xpEarned: xpResult.finalXp,
    statLevelUp,
    newStatLevel,
    characterLevelUp,
    newCharacterLevel: newCharLevel,
    streakIncremented,
    newStreakDays,
    newMultiplier,
    freezeAwarded,
    newlyUnlockedSpecs,
  };
}
