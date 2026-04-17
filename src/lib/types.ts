// ============================================
// OVERCLOCK — Database Types
// Matches Supabase schema 1:1
// ============================================

export type StatName = "STR" | "END" | "DEX" | "INT" | "WIS" | "CHA";
export type QuestType = "repeatable" | "one_off" | "timed" | "chain";
export type LoggingMode = "quick" | "detailed";
export type DifficultyTier = "1" | "2" | "3" | "4" | "5";
export type EnergyLevel = "low" | "high";
export type MotivationLevel = "low" | "high";

// ============================================
// Table row types
// ============================================

export interface Profile {
  id: string;
  username: string | null;
  character_level: number;
  total_xp: number;
  streak_days: number;
  streak_multiplier: number;
  streak_freezes: number;
  last_active_date: string | null;
  active_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stat {
  id: string;
  profile_id: string;
  stat_name: StatName;
  level: number;
  current_xp: number;
  total_xp: number;
  baseline_tonnage: number | null;
  skill_points_available: number;
  created_at: string;
  updated_at: string;
}

export interface Quest {
  id: string;
  profile_id: string;
  name: string;
  stat: StatName;
  difficulty_tier: DifficultyTier;
  base_xp: number;
  quest_type: QuestType;
  logging_mode: LoggingMode;
  is_active: boolean;
  deadline: string | null;
  notes: string | null;
  tags: string[];
  chain_id: string | null;
  chain_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface QuestLog {
  id: string;
  quest_id: string;
  profile_id: string;
  completed_at: string;
  xp_earned: number;
  xp_base: number;
  multiplier_applied: number;
  streak_multiplier: number;
  decay_factor: number;
  volume_data: VolumeData | null;
  mood_at_completion: string | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  quest_log_id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight_kg: number;
  tonnage: number;
  created_at: string;
}

export interface MoodLog {
  id: string;
  profile_id: string;
  logged_at: string;
  energy: EnergyLevel | null;
  motivation: MotivationLevel | null;
  energy_value?: number | null;
  motivation_value?: number | null;
  was_skipped: boolean;
}

export interface StreakHistory {
  id: string;
  profile_id: string;
  streak_start: string;
  streak_end: string | null;
  max_days: number;
  death_tax_applied: number;
  created_at: string;
}

export interface Achievement {
  id: string;
  profile_id: string;
  achievement_key: string;
  unlocked_at: string;
  xp_awarded: number;
}

export interface SkillNode {
  id: string;
  profile_id: string;
  stat_name: StatName;
  branch_name: string;
  node_name: string;
  points_invested: number;
  unlocked_at: string | null;
  created_at: string;
}

export interface Specialisation {
  id: string;
  profile_id: string;
  specialisation_name: string;
  unlocked_at: string;
}

export interface Portrait {
  id: string;
  profile_id: string;
  generated_at: string;
  prompt_used: string | null;
  image_url: string | null;
  stat_snapshot: Record<StatName, { level: number; tier: number }> | null;
  trigger_reason: string | null;
}

export interface Spec {
  id: string;
  profile_id: string;
  spec_name: string;
  focus_areas: string[];
  primary_stats: StatName[];
  activated_at: string;
  is_active: boolean;
  respec_token_available: boolean;
  token_earned_at: string | null;
  created_at: string;
}

export interface SpecOption {
  spec_name: string;
  description: string;
  focus_areas: string[];
  primary_stats: StatName[];
}

export interface SpecHistory {
  id: string;
  profile_id: string;
  spec_name: string;
  focus_areas: string[];
  activated_at: string;
  deactivated_at: string;
  days_active: number;
}

// ============================================
// JSONB nested types
// ============================================

export interface VolumeData {
  exercises: {
    name: string;
    sets: { reps: number; weight: number }[];
  }[];
  total_tonnage: number;
  duration_minutes?: number;
}

// ============================================
// Insert types (omit auto-generated fields)
// ============================================

export type QuestInsert = Omit<Quest, "id" | "profile_id" | "created_at" | "updated_at">;
export type QuestLogInsert = Omit<QuestLog, "id" | "profile_id" | "created_at">;
export type MoodLogInsert = Omit<MoodLog, "id" | "profile_id">;
export type ExerciseInsert = Omit<Exercise, "id" | "created_at">;

// ============================================
// Utility types
// ============================================

/** XP ranges per difficulty tier */
export const TIER_XP_RANGES: Record<DifficultyTier, { min: number; max: number; label: string }> = {
  "1": { min: 10, max: 25, label: "Trivial" },
  "2": { min: 25, max: 75, label: "Easy" },
  "3": { min: 75, max: 150, label: "Moderate" },
  "4": { min: 150, max: 300, label: "Hard" },
  "5": { min: 300, max: 500, label: "Epic" },
};

/** Stat display info */
export const STAT_INFO: Record<StatName, { label: string; colour: string }> = {
  STR: { label: "Strength", colour: "#ff6b35" },
  END: { label: "Endurance", colour: "#ff8c00" },
  DEX: { label: "Dexterity", colour: "#00f0ff" },
  INT: { label: "Intelligence", colour: "#3b82f6" },
  WIS: { label: "Wisdom", colour: "#a855f7" },
  CHA: { label: "Charisma", colour: "#fbbf24" },
};

/** Streak multiplier brackets */
export const STREAK_BRACKETS: { min: number; max: number; multiplier: number }[] = [
  { min: 1, max: 3, multiplier: 1.0 },
  { min: 4, max: 7, multiplier: 1.1 },
  { min: 8, max: 14, multiplier: 1.25 },
  { min: 15, max: 30, multiplier: 1.5 },
  { min: 31, max: 60, multiplier: 1.75 },
  { min: 61, max: 90, multiplier: 2.0 },
  { min: 91, max: Infinity, multiplier: 2.5 },
];
