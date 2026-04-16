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
    .select("spec_name")
    .eq("profile_id", userId);
  if (error) throw error;
  return new Set((data as { spec_name: string }[]).map((r) => r.spec_name));
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
    .select("spec_name")
    .eq("profile_id", userId);
  const alreadyUnlocked = new Set(
    ((existing ?? []) as { spec_name: string }[]).map((r) => r.spec_name)
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
    const inserts = newlyUnlocked.map((spec_name) => ({ profile_id: userId, spec_name }));
    const { error } = await supabase.from("specialisations").insert(inserts);
    if (error) throw error;
  }

  return newlyUnlocked;
}
