import { createClient } from "@/lib/supabase/client";
import {
  getStreakMultiplier,
  calculateDeathTax,
} from "@/lib/xp";
import type { Profile } from "@/lib/types";

// ============================================
// STREAK FREEZE CONSTANTS
// ============================================
export const MAX_STREAK_FREEZES = 2;

// ============================================
// Check if user logged any quest today
// ============================================
export async function hasLoggedToday(profileId: string): Promise<boolean> {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  const { count, error } = await supabase
    .from("quest_logs")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .gte("completed_at", `${today}T00:00:00`)
    .lt("completed_at", `${today}T23:59:59.999`);

  if (error) throw error;
  return (count ?? 0) > 0;
}

// ============================================
// Check if user logged any quest on a specific date
// ============================================
export async function hasLoggedOnDate(
  profileId: string,
  date: string
): Promise<boolean> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("quest_logs")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .gte("completed_at", `${date}T00:00:00`)
    .lt("completed_at", `${date}T23:59:59.999`);

  if (error) throw error;
  return (count ?? 0) > 0;
}

// ============================================
// Get yesterday's date string
// ============================================
function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

// ============================================
// Core streak evaluation
// Called on app load / quest completion
// ============================================

export interface StreakEvalResult {
  streakDays: number;
  streakMultiplier: number;
  deathTaxApplied: number;
  freezeUsed: boolean;
  streakBroken: boolean;
  message: string | null;
}

export async function evaluateStreak(
  profile: Profile
): Promise<StreakEvalResult> {
  const supabase = createClient();
  const today = getToday();
  const yesterday = getYesterday();
  const lastActive = profile.last_active_date;

  // If last active is today, streak is current — no action needed
  if (lastActive === today) {
    return {
      streakDays: profile.streak_days,
      streakMultiplier: getStreakMultiplier(profile.streak_days),
      deathTaxApplied: 0,
      freezeUsed: false,
      streakBroken: false,
      message: null,
    };
  }

  // If last active was yesterday, streak continues (will be updated on next quest log)
  if (lastActive === yesterday) {
    return {
      streakDays: profile.streak_days,
      streakMultiplier: getStreakMultiplier(profile.streak_days),
      deathTaxApplied: 0,
      freezeUsed: false,
      streakBroken: false,
      message: null,
    };
  }

  // If no last active date (new user), start fresh
  if (!lastActive) {
    return {
      streakDays: 0,
      streakMultiplier: 1.0,
      deathTaxApplied: 0,
      freezeUsed: false,
      streakBroken: false,
      message: null,
    };
  }

  // Last active was more than 1 day ago — streak is at risk
  // Calculate how many days were missed
  const lastDate = new Date(lastActive);
  const todayDate = new Date(today);
  const daysMissed = Math.floor(
    (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  ) - 1; // -1 because lastActive day itself was active

  if (daysMissed <= 0) {
    // Edge case: same day or date math weirdness
    return {
      streakDays: profile.streak_days,
      streakMultiplier: getStreakMultiplier(profile.streak_days),
      deathTaxApplied: 0,
      freezeUsed: false,
      streakBroken: false,
      message: null,
    };
  }

  // Check for streak freezes
  const { data: freezeData } = await supabase
    .from("profiles")
    .select("streak_freezes")
    .eq("id", profile.id)
    .single();

  const freezesAvailable = freezeData?.streak_freezes ?? 0;

  // If missed only 1 day and have a freeze, use it
  if (daysMissed === 1 && freezesAvailable > 0) {
    // Use a freeze
    await supabase
      .from("profiles")
      .update({
        streak_freezes: freezesAvailable - 1,
        last_active_date: yesterday, // Pretend yesterday was active
      })
      .eq("id", profile.id);

    return {
      streakDays: profile.streak_days,
      streakMultiplier: getStreakMultiplier(profile.streak_days),
      deathTaxApplied: 0,
      freezeUsed: true,
      streakBroken: false,
      message: `STREAK FREEZE DEPLOYED. ${freezesAvailable - 1} remaining.`,
    };
  }

  // If missed 2 days and have 2 freezes, use both
  if (daysMissed === 2 && freezesAvailable >= 2) {
    await supabase
      .from("profiles")
      .update({
        streak_freezes: freezesAvailable - 2,
        last_active_date: yesterday,
      })
      .eq("id", profile.id);

    return {
      streakDays: profile.streak_days,
      streakMultiplier: getStreakMultiplier(profile.streak_days),
      deathTaxApplied: 0,
      freezeUsed: true,
      streakBroken: false,
      message: `2 STREAK FREEZES DEPLOYED. ${freezesAvailable - 2} remaining.`,
    };
  }

  // Streak is broken — apply death tax
  const deathTax = calculateDeathTax(profile.streak_days);

  // Log the broken streak
  await supabase.from("streak_history").insert({
    profile_id: profile.id,
    streak_start: getStreakStartDate(profile.streak_days, lastActive),
    streak_end: lastActive,
    max_days: profile.streak_days,
    death_tax_applied: deathTax,
  });

  // Apply death tax to profile XP (can't drop below 0 in current level)
  // We subtract from total_xp but floor at the current level's cumulative threshold
  const newTotalXp = Math.max(0, profile.total_xp - deathTax);

  // Reset streak, apply tax
  await supabase
    .from("profiles")
    .update({
      streak_days: 0,
      streak_multiplier: 1.0,
      total_xp: newTotalXp,
    })
    .eq("id", profile.id);

  return {
    streakDays: 0,
    streakMultiplier: 1.0,
    deathTaxApplied: deathTax,
    freezeUsed: false,
    streakBroken: true,
    message: `SYSTEM DAMAGE: ${profile.streak_days}-day streak broken. Death tax: -${deathTax.toLocaleString()} XP.`,
  };
}

// ============================================
// Increment streak (called after quest completion)
// ============================================
export async function incrementStreak(profile: Profile): Promise<{
  newStreakDays: number;
  newMultiplier: number;
}> {
  const supabase = createClient();
  const today = getToday();

  // Only increment if this is the first quest of the day
  if (profile.last_active_date === today) {
    return {
      newStreakDays: profile.streak_days,
      newMultiplier: profile.streak_multiplier,
    };
  }

  const yesterday = getYesterday();
  let newStreakDays: number;

  if (profile.last_active_date === yesterday || profile.streak_days === 0) {
    // Continuing streak or starting fresh
    newStreakDays = profile.streak_days + 1;
  } else {
    // Gap > 1 day and no freeze caught it — start at 1
    newStreakDays = 1;
  }

  const newMultiplier = getStreakMultiplier(newStreakDays);

  await supabase
    .from("profiles")
    .update({
      streak_days: newStreakDays,
      streak_multiplier: newMultiplier,
      last_active_date: today,
    })
    .eq("id", profile.id);

  return { newStreakDays, newMultiplier };
}

// ============================================
// Award streak freeze (e.g. every 7-day streak milestone)
// ============================================
export async function checkAndAwardFreeze(
  profileId: string,
  streakDays: number
): Promise<boolean> {
  // Award a freeze every 7 days of streak, up to max
  if (streakDays > 0 && streakDays % 7 === 0) {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("streak_freezes")
      .eq("id", profileId)
      .single();

    const current = data?.streak_freezes ?? 0;
    if (current < MAX_STREAK_FREEZES) {
      await supabase
        .from("profiles")
        .update({ streak_freezes: current + 1 })
        .eq("id", profileId);
      return true;
    }
  }
  return false;
}

// ============================================
// Helpers
// ============================================

function getStreakStartDate(streakDays: number, lastActive: string): string {
  const d = new Date(lastActive);
  d.setDate(d.getDate() - streakDays + 1);
  return d.toISOString().split("T")[0];
}

/** Get streak status for display */
export function getStreakStatus(
  streakDays: number,
  lastActiveDate: string | null
): {
  status: "active" | "at_risk" | "broken" | "new";
  hoursRemaining?: number;
} {
  if (!lastActiveDate) return { status: "new" };

  const today = getToday();
  if (lastActiveDate === today) return { status: "active" };

  const yesterday = getYesterday();
  if (lastActiveDate === yesterday) {
    // Calculate hours until midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(23, 59, 59, 999);
    const hoursRemaining = Math.max(
      0,
      (midnight.getTime() - now.getTime()) / (1000 * 60 * 60)
    );
    return { status: "at_risk", hoursRemaining: Math.ceil(hoursRemaining) };
  }

  return { status: "broken" };
}
