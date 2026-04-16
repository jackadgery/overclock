import type { StatName } from "@/lib/types";

// ============================================
// Bonus types
// ============================================

export type BonusType = "xp_multiplier" | "dr_floor" | "death_tax_reduction";

export interface NodeBonus {
  type: BonusType;
  /** xp_multiplier: e.g. 1.10 = +10% | dr_floor: e.g. 0.30 | death_tax_reduction: e.g. 0.10 = -10% */
  value: number;
  /** If set, bonus only applies when the quest uses this logging mode */
  loggingMode?: "quick" | "detailed";
}

// ============================================
// Static node definition
// ============================================

export interface StaticNode {
  node_name: string;    // DB key — unique within stat+branch
  branch_name: string;
  stat_name: StatName;
  depth: 1 | 2 | 3;
  cost: number;         // skill points required
  requires: string | null; // node_name of prerequisite (null for depth 1)
  description: string;
  bonus: NodeBonus;
}

export const BRANCH_UNLOCK_LEVEL = 10;

// ============================================
// Full tree — 6 stats × 2 branches × 3 nodes
// ============================================

export const ALL_SKILL_NODES: StaticNode[] = [
  // ── STR ────────────────────────────────────
  // Power
  { stat_name: "STR", branch_name: "Power", node_name: "Compound Focus", depth: 1, cost: 1, requires: null, description: "Detailed STR workouts yield +10% XP.", bonus: { type: "xp_multiplier", value: 1.10, loggingMode: "detailed" } },
  { stat_name: "STR", branch_name: "Power", node_name: "Iron Protocol", depth: 2, cost: 2, requires: "Compound Focus", description: "All STR quests yield +10% XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  { stat_name: "STR", branch_name: "Power", node_name: "Titan Frame", depth: 3, cost: 3, requires: "Iron Protocol", description: "STR diminishing returns floor: 0.35 (was 0.25).", bonus: { type: "dr_floor", value: 0.35 } },
  // Hypertrophy
  { stat_name: "STR", branch_name: "Hypertrophy", node_name: "Volume Drive", depth: 1, cost: 1, requires: null, description: "STR diminishing returns floor raised to 0.30.", bonus: { type: "dr_floor", value: 0.30 } },
  { stat_name: "STR", branch_name: "Hypertrophy", node_name: "High Rep Protocol", depth: 2, cost: 2, requires: "Volume Drive", description: "Quick STR quests yield +10% XP.", bonus: { type: "xp_multiplier", value: 1.10, loggingMode: "quick" } },
  { stat_name: "STR", branch_name: "Hypertrophy", node_name: "Muscle Matrix", depth: 3, cost: 3, requires: "High Rep Protocol", description: "All STR quests yield +10% additional XP.", bonus: { type: "xp_multiplier", value: 1.10 } },

  // ── END ────────────────────────────────────
  // Aerobic
  { stat_name: "END", branch_name: "Aerobic", node_name: "Steady State", depth: 1, cost: 1, requires: null, description: "All END quests yield +10% XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  { stat_name: "END", branch_name: "Aerobic", node_name: "Long Haul", depth: 2, cost: 2, requires: "Steady State", description: "END diminishing returns floor raised to 0.30.", bonus: { type: "dr_floor", value: 0.30 } },
  { stat_name: "END", branch_name: "Aerobic", node_name: "Endurance Core", depth: 3, cost: 3, requires: "Long Haul", description: "All END quests yield +10% additional XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  // Resilience
  { stat_name: "END", branch_name: "Resilience", node_name: "Grit Protocol", depth: 1, cost: 1, requires: null, description: "Death tax penalty reduced by 10%.", bonus: { type: "death_tax_reduction", value: 0.10 } },
  { stat_name: "END", branch_name: "Resilience", node_name: "Fortified", depth: 2, cost: 2, requires: "Grit Protocol", description: "END diminishing returns floor raised to 0.30.", bonus: { type: "dr_floor", value: 0.30 } },
  { stat_name: "END", branch_name: "Resilience", node_name: "Indomitable", depth: 3, cost: 3, requires: "Fortified", description: "Death tax penalty reduced by an additional 10%.", bonus: { type: "death_tax_reduction", value: 0.10 } },

  // ── DEX ────────────────────────────────────
  // Mobility
  { stat_name: "DEX", branch_name: "Mobility", node_name: "Joint Conditioning", depth: 1, cost: 1, requires: null, description: "All DEX quests yield +10% XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  { stat_name: "DEX", branch_name: "Mobility", node_name: "Flow State", depth: 2, cost: 2, requires: "Joint Conditioning", description: "DEX diminishing returns floor raised to 0.30.", bonus: { type: "dr_floor", value: 0.30 } },
  { stat_name: "DEX", branch_name: "Mobility", node_name: "Kinetic Mastery", depth: 3, cost: 3, requires: "Flow State", description: "All DEX quests yield +10% additional XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  // Precision
  { stat_name: "DEX", branch_name: "Precision", node_name: "Calibration", depth: 1, cost: 1, requires: null, description: "DEX diminishing returns floor raised to 0.30.", bonus: { type: "dr_floor", value: 0.30 } },
  { stat_name: "DEX", branch_name: "Precision", node_name: "Technique Lock", depth: 2, cost: 2, requires: "Calibration", description: "All DEX quests yield +10% XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  { stat_name: "DEX", branch_name: "Precision", node_name: "Neural Precision", depth: 3, cost: 3, requires: "Technique Lock", description: "All DEX quests yield +10% additional XP.", bonus: { type: "xp_multiplier", value: 1.10 } },

  // ── INT ────────────────────────────────────
  // Builder
  { stat_name: "INT", branch_name: "Builder", node_name: "Deep Work", depth: 1, cost: 1, requires: null, description: "All INT quests yield +10% XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  { stat_name: "INT", branch_name: "Builder", node_name: "Iteration Engine", depth: 2, cost: 2, requires: "Deep Work", description: "INT diminishing returns floor raised to 0.30.", bonus: { type: "dr_floor", value: 0.30 } },
  { stat_name: "INT", branch_name: "Builder", node_name: "Architect Mode", depth: 3, cost: 3, requires: "Iteration Engine", description: "All INT quests yield +10% additional XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  // Scholar
  { stat_name: "INT", branch_name: "Scholar", node_name: "Intake Protocol", depth: 1, cost: 1, requires: null, description: "INT diminishing returns floor raised to 0.30.", bonus: { type: "dr_floor", value: 0.30 } },
  { stat_name: "INT", branch_name: "Scholar", node_name: "Knowledge Stack", depth: 2, cost: 2, requires: "Intake Protocol", description: "All INT quests yield +10% XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  { stat_name: "INT", branch_name: "Scholar", node_name: "Polymath Drive", depth: 3, cost: 3, requires: "Knowledge Stack", description: "All INT quests yield +10% additional XP.", bonus: { type: "xp_multiplier", value: 1.10 } },

  // ── WIS ────────────────────────────────────
  // Planner
  { stat_name: "WIS", branch_name: "Planner", node_name: "Systems Thinking", depth: 1, cost: 1, requires: null, description: "All WIS quests yield +10% XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  { stat_name: "WIS", branch_name: "Planner", node_name: "Efficiency Protocol", depth: 2, cost: 2, requires: "Systems Thinking", description: "WIS diminishing returns floor raised to 0.30.", bonus: { type: "dr_floor", value: 0.30 } },
  { stat_name: "WIS", branch_name: "Planner", node_name: "Master Planner", depth: 3, cost: 3, requires: "Efficiency Protocol", description: "All WIS quests yield +10% additional XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  // Reflective
  { stat_name: "WIS", branch_name: "Reflective", node_name: "Perspective", depth: 1, cost: 1, requires: null, description: "WIS diminishing returns floor raised to 0.30.", bonus: { type: "dr_floor", value: 0.30 } },
  { stat_name: "WIS", branch_name: "Reflective", node_name: "Inner Compass", depth: 2, cost: 2, requires: "Perspective", description: "All WIS quests yield +10% XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  { stat_name: "WIS", branch_name: "Reflective", node_name: "Oracle State", depth: 3, cost: 3, requires: "Inner Compass", description: "All WIS quests yield +10% additional XP.", bonus: { type: "xp_multiplier", value: 1.10 } },

  // ── CHA ────────────────────────────────────
  // Domestic
  { stat_name: "CHA", branch_name: "Domestic", node_name: "Home Base", depth: 1, cost: 1, requires: null, description: "All CHA quests yield +10% XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  { stat_name: "CHA", branch_name: "Domestic", node_name: "Maintenance Protocol", depth: 2, cost: 2, requires: "Home Base", description: "CHA diminishing returns floor raised to 0.30.", bonus: { type: "dr_floor", value: 0.30 } },
  { stat_name: "CHA", branch_name: "Domestic", node_name: "Hearth Engine", depth: 3, cost: 3, requires: "Maintenance Protocol", description: "All CHA quests yield +10% additional XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  // Social
  { stat_name: "CHA", branch_name: "Social", node_name: "Signal Boost", depth: 1, cost: 1, requires: null, description: "CHA diminishing returns floor raised to 0.30.", bonus: { type: "dr_floor", value: 0.30 } },
  { stat_name: "CHA", branch_name: "Social", node_name: "Presence Protocol", depth: 2, cost: 2, requires: "Signal Boost", description: "All CHA quests yield +10% XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
  { stat_name: "CHA", branch_name: "Social", node_name: "Command Authority", depth: 3, cost: 3, requires: "Presence Protocol", description: "All CHA quests yield +10% additional XP.", bonus: { type: "xp_multiplier", value: 1.10 } },
];

// ============================================
// Cross-stat specialisations
// ============================================

export interface CrossStatSpec {
  spec_name: string;
  description: string;
  requirements: Partial<Record<StatName, number>>;
  bonus: {
    type: BonusType;
    value: number;
    /** Which stats the bonus applies to (empty = all stats / global) */
    stats: StatName[];
  };
  bonusDescription: string;
}

export const CROSS_STAT_SPECS: CrossStatSpec[] = [
  {
    spec_name: "Ironman",
    description: "Complete athlete. Body as a unified system.",
    requirements: { STR: 20, END: 20 },
    bonus: { type: "xp_multiplier", value: 1.20, stats: ["STR", "END", "DEX"] },
    bonusDescription: "+20% XP on all STR, END, DEX quests.",
  },
  {
    spec_name: "Warrior",
    description: "Combat readiness. Speed meets strength.",
    requirements: { STR: 20, DEX: 15 },
    bonus: { type: "dr_floor", value: 0.35, stats: ["STR", "END", "DEX"] },
    bonusDescription: "Physical quest DR floor raised to 0.35.",
  },
  {
    spec_name: "Polymath",
    description: "The renaissance mind. Knowledge compounds.",
    requirements: { INT: 20, WIS: 15 },
    bonus: { type: "xp_multiplier", value: 1.15, stats: ["INT", "WIS"] },
    bonusDescription: "+15% XP on INT and WIS quests.",
  },
  {
    spec_name: "Stoic",
    description: "Physical and mental resilience. Nothing breaks you.",
    requirements: { END: 15, WIS: 20 },
    bonus: { type: "death_tax_reduction", value: 0.20, stats: [] },
    bonusDescription: "Death tax reduced by 20%.",
  },
  {
    spec_name: "Renaissance",
    description: "Balanced excellence across all systems.",
    requirements: { STR: 15, END: 15, DEX: 15, INT: 15, WIS: 15, CHA: 15 },
    bonus: { type: "xp_multiplier", value: 1.10, stats: ["STR", "END", "DEX", "INT", "WIS", "CHA"] },
    bonusDescription: "+10% XP on all quests.",
  },
  {
    spec_name: "Titan",
    description: "Late-game prestige. All systems maximised.",
    requirements: { STR: 30, END: 30, DEX: 30, INT: 30, WIS: 30, CHA: 30 },
    bonus: { type: "xp_multiplier", value: 1.25, stats: ["STR", "END", "DEX", "INT", "WIS", "CHA"] },
    bonusDescription: "+25% XP on all quests.",
  },
];

// ============================================
// Helpers
// ============================================

/** All branches for a stat, each with their sorted nodes */
export function getBranchesForStat(stat: StatName): { branch_name: string; nodes: StaticNode[] }[] {
  const nodes = ALL_SKILL_NODES.filter((n) => n.stat_name === stat);
  const branches = [...new Set(nodes.map((n) => n.branch_name))];
  return branches.map((b) => ({
    branch_name: b,
    nodes: nodes.filter((n) => n.branch_name === b).sort((a, b) => a.depth - b.depth),
  }));
}

/** All nodes for a stat (for XP engine lookups) */
export function getNodesForStat(stat: StatName): StaticNode[] {
  return ALL_SKILL_NODES.filter((n) => n.stat_name === stat);
}

/** Compute the XP node multiplier for a quest completion.
 *  Pass the set of unlocked node_names (from the DB), the quest's stat and logging mode.
 */
export function computeNodeMultiplier(
  unlockedNodeNames: Set<string>,
  stat: StatName,
  loggingMode: "quick" | "detailed"
): number {
  const applicable = ALL_SKILL_NODES.filter(
    (n) =>
      n.stat_name === stat &&
      unlockedNodeNames.has(n.node_name) &&
      n.bonus.type === "xp_multiplier" &&
      (!n.bonus.loggingMode || n.bonus.loggingMode === loggingMode)
  );
  return applicable.reduce((acc, n) => acc * n.bonus.value, 1.0);
}

/** Compute the DR floor from unlocked nodes + cross-stat specs for a stat. */
export function computeDrFloor(
  unlockedNodeNames: Set<string>,
  unlockedSpecNames: Set<string>,
  stat: StatName
): number {
  // From branch nodes
  const nodeDrValues = ALL_SKILL_NODES.filter(
    (n) =>
      n.stat_name === stat &&
      unlockedNodeNames.has(n.node_name) &&
      n.bonus.type === "dr_floor"
  ).map((n) => n.bonus.value);

  // From cross-stat specs
  const specDrValues = CROSS_STAT_SPECS.filter(
    (s) =>
      unlockedSpecNames.has(s.spec_name) &&
      s.bonus.type === "dr_floor" &&
      (s.bonus.stats.length === 0 || s.bonus.stats.includes(stat))
  ).map((s) => s.bonus.value);

  return Math.max(0.25, ...nodeDrValues, ...specDrValues);
}

/** Compute the XP multiplier from cross-stat specialisations for a quest's stat. */
export function computeSpecMultiplier(
  unlockedSpecNames: Set<string>,
  stat: StatName
): number {
  const applicable = CROSS_STAT_SPECS.filter(
    (s) =>
      unlockedSpecNames.has(s.spec_name) &&
      s.bonus.type === "xp_multiplier" &&
      (s.bonus.stats.length === 0 || s.bonus.stats.includes(stat))
  );
  return applicable.reduce((acc, s) => acc * s.bonus.value, 1.0);
}
