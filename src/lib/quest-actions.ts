import { createClient } from "@/lib/supabase/client";
import { calculateXp, xpRequiredForLevel } from "@/lib/xp";
import { incrementStreak, checkAndAwardFreeze } from "@/lib/streak";
import { getUnlockedNodeNames, getUnlockedSpecNames, checkAndUnlockSpecialisations, getActiveSpec } from "@/lib/db";
import { computeNodeMultiplier, computeDrFloor, computeSpecMultiplier } from "@/lib/skill-tree";
import { checkAndAwardQuestAchievements } from "@/lib/achievement-engine";
import type { AchievementDef } from "@/lib/achievements";
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
  newlyUnlockedAchievements: AchievementDef[];
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
  const { newStreakDays, newMultiplier, newlyUnlockedAchievements: streakAchievements } =
    await incrementStreak(profile);

  // Check for freeze award
  const freezeAwarded = await checkAndAwardFreeze(profile.id, newStreakDays);

  // Fetch skill tree bonuses + active spec
  const [unlockedNodes, unlockedSpecs, activeSpec] = await Promise.all([
    getUnlockedNodeNames(),
    getUnlockedSpecNames(),
    getActiveSpec(),
  ]);
  const nodeMultiplier = computeNodeMultiplier(unlockedNodes, quest.stat, quest.logging_mode);
  const baseDrFloor = computeDrFloor(unlockedNodes, unlockedSpecs, quest.stat);

  // Active spec: +1.15× and DR floor raised to 0.35 on primary stats
  const specAligned =
    activeSpec !== null &&
    (activeSpec.primary_stats as string[]).includes(quest.stat);
  const drFloor = specAligned ? Math.max(baseDrFloor, 0.35) : baseDrFloor;

  // Combine cross-stat specialisation multiplier with active spec bonus
  const crossStatMultiplier = computeSpecMultiplier(unlockedSpecs, quest.stat);
  const specMultiplier = crossStatMultiplier * (specAligned ? 1.15 : 1.0);

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

  // Check and award achievements
  const newlyUnlockedAchievements = await checkAndAwardQuestAchievements({
    stat: quest.stat,
    decayFactor: xpResult.decayFactor,
    newStatLevel,
    allStats: updatedStats.map((s) => ({ stat_name: s.stat_name, level: s.level })),
    xpEarned: xpResult.finalXp,
    hourOfDay: new Date().getHours(),
    newCharLevel,
  });

  // Merge streak achievements from incrementStreak
  const allUnlocked = [
    ...newlyUnlockedAchievements,
    ...(streakAchievements ?? []),
  ];

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
    newlyUnlockedAchievements: allUnlocked,
  };
}
