import { STREAK_BRACKETS, type DifficultyTier, TIER_XP_RANGES } from "@/lib/types";

// ============================================
// LEVELLING
// ============================================

/** XP required to reach level N (from N-1) */
export function xpRequiredForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

/** Cumulative XP required to reach level N from level 0 */
export function cumulativeXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += xpRequiredForLevel(i);
  }
  return total;
}

/** Calculate level from total XP */
export function levelFromTotalXp(totalXp: number): number {
  let level = 0;
  let cumulative = 0;
  while (true) {
    const next = xpRequiredForLevel(level + 1);
    if (cumulative + next > totalXp) break;
    cumulative += next;
    level++;
  }
  return level;
}

/** XP progress within current level (returns { current, required }) */
export function xpProgress(totalXp: number): { current: number; required: number; level: number } {
  const level = levelFromTotalXp(totalXp);
  const cumAtLevel = cumulativeXpForLevel(level);
  const current = totalXp - cumAtLevel;
  const required = xpRequiredForLevel(level + 1);
  return { current, required, level };
}

// ============================================
// STREAK MULTIPLIER
// ============================================

/** Get streak multiplier for a given streak length */
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays <= 0) return 1.0;
  for (const bracket of STREAK_BRACKETS) {
    if (streakDays >= bracket.min && streakDays <= bracket.max) {
      return bracket.multiplier;
    }
  }
  return 2.5; // 91+ fallback
}

// ============================================
// DEATH TAX
// ============================================

/** Calculate death tax XP penalty for a broken streak */
export function calculateDeathTax(streakDays: number): number {
  if (streakDays <= 0) return 0;
  return Math.floor(streakDays * 15 * Math.log2(streakDays + 1));
}

// ============================================
// DIMINISHING RETURNS
// ============================================

/**
 * Calculate decay factor based on how many times this quest
 * has been completed at the same intensity in the rolling window.
 * sameIntensityCount = number of completions at same tier/tonnage
 * in the last 14 completions of this quest.
 */
export function calculateDecayFactor(sameIntensityCount: number, floor: number = 0.25): number {
  return Math.max(floor, 1 - 0.05 * sameIntensityCount);
}

// ============================================
// VOLUME SCALING
// ============================================

/** Calculate volume multiplier for detailed fitness logging */
export function calculateVolumeMultiplier(
  actualTonnage: number,
  baselineTonnage: number
): number {
  if (baselineTonnage <= 0) return 1.0;
  return actualTonnage / baselineTonnage;
}

/** Calculate tonnage from exercise data */
export function calculateTonnage(
  sets: { reps: number; weight: number }[]
): number {
  return sets.reduce((total, set) => total + set.reps * set.weight, 0);
}

/** New baseline after level-up (5% increase) */
export function recalibrateBaseline(
  currentBaseline: number,
  percentage: number = 0.05
): number {
  return currentBaseline * (1 + percentage);
}

// ============================================
// FULL XP CALCULATION
// ============================================

export interface XpCalculationInput {
  baseXp: number;
  streakDays: number;
  sameIntensityCount: number;
  /** For detailed logging only */
  actualTonnage?: number;
  baselineTonnage?: number;
  /** Spec bonus (1.15 if quest aligns with active spec) */
  specMultiplier?: number;
  /** Combined XP multiplier from unlocked skill tree nodes */
  nodeMultiplier?: number;
  /** DR floor from unlocked skill tree nodes (default 0.25) */
  drFloor?: number;
}

export interface XpCalculationResult {
  finalXp: number;
  baseXp: number;
  volumeMultiplier: number;
  streakMultiplier: number;
  decayFactor: number;
  specMultiplier: number;
  nodeMultiplier: number;
}

/** Calculate final XP earned for a quest completion */
export function calculateXp(input: XpCalculationInput): XpCalculationResult {
  const volumeMultiplier =
    input.actualTonnage != null && input.baselineTonnage != null
      ? calculateVolumeMultiplier(input.actualTonnage, input.baselineTonnage)
      : 1.0;

  const streakMultiplier = getStreakMultiplier(input.streakDays);
  const drFloor = input.drFloor ?? 0.25;
  const decayFactor = calculateDecayFactor(input.sameIntensityCount, drFloor);
  const specMultiplier = input.specMultiplier ?? 1.0;
  const nodeMultiplier = input.nodeMultiplier ?? 1.0;

  const finalXp = Math.floor(
    input.baseXp * volumeMultiplier * streakMultiplier * decayFactor * specMultiplier * nodeMultiplier
  );

  return {
    finalXp,
    baseXp: input.baseXp,
    volumeMultiplier,
    streakMultiplier,
    decayFactor,
    specMultiplier,
    nodeMultiplier,
  };
}

// ============================================
// VALIDATION
// ============================================

/** Validate base XP is within tier range */
export function validateBaseXp(tier: DifficultyTier, baseXp: number): boolean {
  const range = TIER_XP_RANGES[tier];
  return baseXp >= range.min && baseXp <= range.max;
}

/** Character level from total aggregate XP across all stats */
export function characterLevelFromStats(statTotalXps: number[]): number {
  const aggregateXp = statTotalXps.reduce((sum, xp) => sum + xp, 0);
  return levelFromTotalXp(aggregateXp);
}
