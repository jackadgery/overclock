import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  Stat,
  Quest,
  QuestInsert,
  QuestLog,
  QuestLogInsert,
  MoodLog,
  MoodLogInsert,
  StreakHistory,
  Achievement,
  Spec,
  StatName,
} from "@/lib/types";
import { CROSS_STAT_SPECS } from "@/lib/skill-tree";

// ============================================
// Helper: get current user ID or throw
// ============================================

async function getUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// ============================================
// PROFILE
// ============================================

export async function getProfile(): Promise<Profile> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  updates: Partial<Pick<Profile, "username" | "active_title" | "streak_days" | "streak_multiplier" | "last_active_date" | "character_level" | "total_xp">>
): Promise<Profile> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// STATS
// ============================================

export async function getStats(): Promise<Stat[]> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("stats")
    .select("*")
    .eq("profile_id", userId)
    .order("stat_name");
  if (error) throw error;
  return data;
}

export async function getStat(statName: StatName): Promise<Stat> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("stats")
    .select("*")
    .eq("profile_id", userId)
    .eq("stat_name", statName)
    .single();
  if (error) throw error;
  return data;
}

export async function updateStat(
  statName: StatName,
  updates: Partial<Pick<Stat, "level" | "current_xp" | "total_xp" | "baseline_tonnage" | "skill_points_available">>
): Promise<Stat> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("stats")
    .update(updates)
    .eq("profile_id", userId)
    .eq("stat_name", statName)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// QUESTS
// ============================================

export async function getQuests(activeOnly = true): Promise<Quest[]> {
  const supabase = createClient();
  const userId = await getUserId();
  let query = supabase
    .from("quests")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false });
  if (activeOnly) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getQuest(questId: string): Promise<Quest> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quests")
    .select("*")
    .eq("id", questId)
    .single();
  if (error) throw error;
  return data;
}

export async function createQuest(quest: QuestInsert): Promise<Quest> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("quests")
    .insert({ ...quest, profile_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuest(
  questId: string,
  updates: Partial<QuestInsert>
): Promise<Quest> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quests")
    .update(updates)
    .eq("id", questId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deactivateQuest(questId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("quests")
    .update({ is_active: false })
    .eq("id", questId);
  if (error) throw error;
}

// ============================================
// QUEST LOGS
// ============================================

export async function getQuestLogs(limit = 50): Promise<QuestLog[]> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("quest_logs")
    .select("*")
    .eq("profile_id", userId)
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getQuestLogsForQuest(
  questId: string,
  limit = 14
): Promise<QuestLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quest_logs")
    .select("*")
    .eq("quest_id", questId)
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function createQuestLog(log: QuestLogInsert): Promise<QuestLog> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("quest_logs")
    .insert({ ...log, profile_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// MOOD LOGS
// ============================================

export async function getTodayMoodLog(): Promise<MoodLog | null> {
  const supabase = createClient();
  const userId = await getUserId();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("mood_logs")
    .select("*")
    .eq("profile_id", userId)
    .gte("logged_at", todayStart.toISOString())
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMoodLogs(limit = 5): Promise<MoodLog[]> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("mood_logs")
    .select("*")
    .eq("profile_id", userId)
    .order("logged_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function createMoodLog(log: MoodLogInsert): Promise<MoodLog> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("mood_logs")
    .insert({ ...log, profile_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// STREAK HISTORY
// ============================================

export async function getStreakHistory(limit = 10): Promise<StreakHistory[]> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("streak_history")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function createStreakRecord(
  record: Omit<StreakHistory, "id" | "profile_id" | "created_at">
): Promise<StreakHistory> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("streak_history")
    .insert({ ...record, profile_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// ACHIEVEMENTS
// ============================================

export async function getAchievements(): Promise<Achievement[]> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .eq("profile_id", userId)
    .order("unlocked_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function unlockAchievement(
  achievementKey: string,
  xpAwarded: number
): Promise<Achievement> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("achievements")
    .upsert(
      {
        profile_id: userId,
        achievement_key: achievementKey,
        xp_awarded: xpAwarded,
      },
      { onConflict: "profile_id,achievement_key" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// SKILL NODES
// ============================================

export async function getUnlockedNodeNames(): Promise<Set<string>> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("skill_nodes")
    .select("node_name")
    .eq("profile_id", userId);
  if (error) throw error;
  return new Set((data as { node_name: string }[]).map((r) => r.node_name));
}

export async function getUnlockedNodeNamesForStat(stat: StatName): Promise<Set<string>> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("skill_nodes")
    .select("node_name")
    .eq("profile_id", userId)
    .eq("stat_name", stat);
  if (error) throw error;
  return new Set((data as { node_name: string }[]).map((r) => r.node_name));
}

export async function spendSkillPoint(
  stat: StatName,
  branchName: string,
  nodeName: string,
  cost: number
): Promise<void> {
  const supabase = createClient();
  const userId = await getUserId();

  const { data: statData, error: statFetchError } = await supabase
    .from("stats")
    .select("skill_points_available")
    .eq("profile_id", userId)
    .eq("stat_name", stat)
    .single();
  if (statFetchError) throw statFetchError;
  if ((statData as { skill_points_available: number }).skill_points_available < cost) {
    throw new Error("Insufficient skill points");
  }

  const { error: insertError } = await supabase
    .from("skill_nodes")
    .insert({ profile_id: userId, stat_name: stat, branch_name: branchName, node_name: nodeName });
  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from("stats")
    .update({
      skill_points_available:
        (statData as { skill_points_available: number }).skill_points_available - cost,
    })
    .eq("profile_id", userId)
    .eq("stat_name", stat);
  if (updateError) throw updateError;
}

// ============================================
// SPECIALISATIONS
// ============================================

export async function getUnlockedSpecNames(): Promise<Set<string>> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("specialisations")
    .select("specialisation_name")
    .eq("profile_id", userId);
  if (error) throw error;
  return new Set((data as { specialisation_name: string }[]).map((r) => r.specialisation_name));
}

export async function checkAndUnlockSpecialisations(
  stats: Stat[]
): Promise<string[]> {
  const supabase = createClient();
  const userId = await getUserId();

  const statLevels: Partial<Record<StatName, number>> = {};
  for (const s of stats) {
    statLevels[s.stat_name as StatName] = s.level;
  }

  const { data: existing } = await supabase
    .from("specialisations")
    .select("specialisation_name")
    .eq("profile_id", userId);
  const alreadyUnlocked = new Set(
    ((existing ?? []) as { specialisation_name: string }[]).map((r) => r.specialisation_name)
  );

  const newlyUnlocked: string[] = [];
  for (const spec of CROSS_STAT_SPECS) {
    if (alreadyUnlocked.has(spec.spec_name)) continue;
    const met = Object.entries(spec.requirements).every(
      ([statName, required]) => (statLevels[statName as StatName] ?? 0) >= (required as number)
    );
    if (met) newlyUnlocked.push(spec.spec_name);
  }

  if (newlyUnlocked.length > 0) {
    const inserts = newlyUnlocked.map((specialisation_name) => ({ profile_id: userId, specialisation_name }));
    const { error } = await supabase.from("specialisations").insert(inserts);
    if (error) throw error;
  }

  return newlyUnlocked;
}

// ============================================
// SPECS (Active Focus)
// ============================================

export async function getActiveSpec(): Promise<Spec | null> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("specs")
    .select("*")
    .eq("profile_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function activateSpec(input: {
  spec_name: string;
  focus_areas: string[];
  primary_stats: StatName[];
}): Promise<Spec> {
  const supabase = createClient();
  const userId = await getUserId();

  // Archive current active spec to history
  const { data: current } = await supabase
    .from("specs")
    .select("*")
    .eq("profile_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (current) {
    const daysActive = Math.floor(
      (Date.now() - new Date(current.activated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    await supabase.from("spec_history").insert({
      profile_id: userId,
      spec_name: current.spec_name,
      focus_areas: current.focus_areas,
      activated_at: current.activated_at,
      deactivated_at: new Date().toISOString(),
      days_active: daysActive,
    });
    await supabase.from("specs").update({ is_active: false }).eq("id", current.id);
  }

  const { data, error } = await supabase
    .from("specs")
    .insert({
      profile_id: userId,
      spec_name: input.spec_name,
      focus_areas: input.focus_areas,
      primary_stats: input.primary_stats,
      activated_at: new Date().toISOString(),
      is_active: true,
      respec_token_available: false,
      token_earned_at: null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function checkAndAwardRespecToken(): Promise<boolean> {
  const supabase = createClient();
  const userId = await getUserId();

  const { data: spec } = await supabase
    .from("specs")
    .select("*")
    .eq("profile_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!spec || spec.respec_token_available) return false;

  const daysSince =
    (Date.now() - new Date(spec.activated_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 30) return false;

  const { error } = await supabase
    .from("specs")
    .update({ respec_token_available: true, token_earned_at: new Date().toISOString() })
    .eq("id", spec.id);
  if (error) throw error;
  return true;
}

// ============================================
// ACHIEVEMENTS
// ============================================

export async function getUnlockedAchievementKeys(): Promise<Set<string>> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("achievements")
    .select("achievement_key")
    .eq("profile_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((r: { achievement_key: string }) => r.achievement_key));
}

/** Insert achievements and award their XP bonus to total_xp. Skips keys already unlocked. */
export async function unlockAchievements(
  items: Array<{ key: string; xp_bonus: number }>
): Promise<void> {
  if (items.length === 0) return;
  const supabase = createClient();
  const userId = await getUserId();

  const now = new Date().toISOString();
  const inserts = items.map((item) => ({
    profile_id: userId,
    achievement_key: item.key,
    unlocked_at: now,
    xp_awarded: item.xp_bonus,
  }));

  // Insert with on-conflict ignore (duplicate keys are skipped)
  const { error } = await supabase
    .from("achievements")
    .upsert(inserts, { onConflict: "profile_id,achievement_key", ignoreDuplicates: true });
  if (error) throw error;

  // Award total XP bonus
  const totalBonus = items.reduce((sum, i) => sum + i.xp_bonus, 0);
  if (totalBonus > 0) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_xp")
      .eq("id", userId)
      .single();
    await supabase
      .from("profiles")
      .update({ total_xp: (profile?.total_xp ?? 0) + totalBonus })
      .eq("id", userId);
  }
}

/** Total number of quest log entries for this user */
export async function getTotalQuestCount(): Promise<number> {
  const supabase = createClient();
  const userId = await getUserId();
  const { count, error } = await supabase
    .from("quest_logs")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId);
  if (error) throw error;
  return count ?? 0;
}

/** Stats completed today and quest count today */
export async function getTodayQuestStats(): Promise<{
  statsCompleted: Set<StatName>;
  questCount: number;
}> {
  const supabase = createClient();
  const userId = await getUserId();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("quest_logs")
    .select("xp_earned, quests(stat)")
    .eq("profile_id", userId)
    .gte("completed_at", `${today}T00:00:00`)
    .lte("completed_at", `${today}T23:59:59.999`);

  if (error) throw error;

  const statsCompleted = new Set<StatName>();
  for (const row of (data ?? []) as unknown as Array<{ xp_earned: number; quests: { stat: string } | null }>) {
    const stat = row.quests?.stat;
    if (stat) statsCompleted.add(stat as StatName);
  }

  return { statsCompleted, questCount: (data ?? []).length };
}

/** Streak break history for recovery achievement checks */
export async function getStreakBreakHistory(): Promise<
  Array<{ max_days: number; death_tax_applied: number }>
> {
  const supabase = createClient();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("streak_history")
    .select("max_days, death_tax_applied")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<{ max_days: number; death_tax_applied: number }>;
}

export async function setActiveTitle(title: string | null): Promise<void> {
  const supabase = createClient();
  const userId = await getUserId();
  const { error } = await supabase
    .from("profiles")
    .update({ active_title: title })
    .eq("id", userId);
  if (error) throw error;
}
