import type { StatName } from "@/lib/types";

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  hint: string;
  xp_bonus: number;
  hidden: boolean;
  category: "milestone" | "streak" | "event" | "recovery" | "hidden";
  unlocks_title?: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ── Milestone ─────────────────────────────────────────────────────────────
  {
    key: "first_blood",
    name: "First Blood",
    description: "Complete your first quest.",
    hint: "Complete a quest.",
    xp_bonus: 50,
    hidden: false,
    category: "milestone",
  },
  {
    key: "decathlon",
    name: "Decathlon",
    description: "Reach level 10 in any stat.",
    hint: "Reach level 10 in any stat.",
    xp_bonus: 500,
    hidden: false,
    category: "milestone",
  },
  {
    key: "well_rounded",
    name: "Well-Rounded",
    description: "All stats at level 5+.",
    hint: "Bring all stats to level 5.",
    xp_bonus: 750,
    hidden: false,
    category: "milestone",
  },
  {
    key: "balanced_force",
    name: "Balanced Force",
    description: "All stats at level 10+.",
    hint: "Bring all stats to level 10.",
    xp_bonus: 2000,
    hidden: false,
    category: "milestone",
  },
  {
    key: "perfectionist",
    name: "Perfectionist",
    description: "All stats at level 25+.",
    hint: "Bring all stats to level 25.",
    xp_bonus: 10000,
    hidden: false,
    category: "milestone",
  },
  {
    key: "century",
    name: "Century",
    description: "Complete 100 quests.",
    hint: "Complete 100 quests.",
    xp_bonus: 1000,
    hidden: false,
    category: "milestone",
  },
  {
    key: "half_millennium",
    name: "Half-Millennium",
    description: "Complete 500 quests.",
    hint: "Complete 500 quests.",
    xp_bonus: 5000,
    hidden: false,
    category: "milestone",
  },
  {
    key: "the_thousand",
    name: "The Thousand",
    description: "Complete 1,000 quests.",
    hint: "Complete 1,000 quests.",
    xp_bonus: 15000,
    hidden: false,
    category: "milestone",
  },
  {
    key: "max_level_any",
    name: "Ascendant Subsystem",
    description: "Reach level 50 in any stat.",
    hint: "Max out a stat.",
    xp_bonus: 25000,
    hidden: false,
    category: "milestone",
  },
  {
    key: "grandmaster",
    name: "Grandmaster",
    description: "Reach character level 100.",
    hint: "Reach character level 100.",
    xp_bonus: 100000,
    hidden: false,
    category: "milestone",
  },

  // ── Streak ────────────────────────────────────────────────────────────────
  {
    key: "streak_7",
    name: "Getting Started",
    description: "7-day streak.",
    hint: "Maintain a 7-day streak.",
    xp_bonus: 100,
    hidden: false,
    category: "streak",
  },
  {
    key: "streak_14",
    name: "Two Weeks Strong",
    description: "14-day streak.",
    hint: "Maintain a 14-day streak.",
    xp_bonus: 300,
    hidden: false,
    category: "streak",
  },
  {
    key: "streak_30",
    name: "Monthly",
    description: "30-day streak.",
    hint: "Maintain a 30-day streak.",
    xp_bonus: 750,
    hidden: false,
    category: "streak",
  },
  {
    key: "streak_60",
    name: "Iron Will",
    description: "60-day streak.",
    hint: "Maintain a 60-day streak.",
    xp_bonus: 2000,
    hidden: false,
    category: "streak",
  },
  {
    key: "streak_90",
    name: "Unkillable",
    description: "90-day streak.",
    hint: "Maintain a 90-day streak.",
    xp_bonus: 5000,
    hidden: false,
    category: "streak",
    unlocks_title: "Unkillable",
  },
  {
    key: "streak_180",
    name: "The Long Road",
    description: "180-day streak.",
    hint: "Maintain a 180-day streak.",
    xp_bonus: 15000,
    hidden: false,
    category: "streak",
  },
  {
    key: "streak_365",
    name: "Year One",
    description: "365-day streak.",
    hint: "Maintain a 365-day streak.",
    xp_bonus: 50000,
    hidden: false,
    category: "streak",
  },

  // ── Event ─────────────────────────────────────────────────────────────────
  {
    key: "dawn_warrior",
    name: "Dawn Warrior",
    description: "Complete a quest before 6 AM.",
    hint: "Complete a quest before 6 AM.",
    xp_bonus: 100,
    hidden: false,
    category: "event",
  },
  {
    key: "night_owl",
    name: "Night Owl",
    description: "Complete a quest after 11 PM.",
    hint: "Complete a quest after 11 PM.",
    xp_bonus: 100,
    hidden: false,
    category: "event",
  },
  {
    key: "double_tap",
    name: "Double Tap",
    description: "Complete quests in 2 different stats in one day.",
    hint: "Hit 2 different subsystems in one day.",
    xp_bonus: 150,
    hidden: false,
    category: "event",
  },
  {
    key: "pentathlon",
    name: "Pentathlon",
    description: "Complete quests in 5 different stats in one day.",
    hint: "Hit 5 different subsystems in one day.",
    xp_bonus: 500,
    hidden: false,
    category: "event",
  },
  {
    key: "full_sweep",
    name: "Full Sweep",
    description: "Complete quests in all 6 stats in one day.",
    hint: "Hit all 6 subsystems in one day.",
    xp_bonus: 1000,
    hidden: false,
    category: "event",
  },
  {
    key: "variety_pack",
    name: "Variety Pack",
    description: "Complete 10 different quests in 7 days.",
    hint: "10 different quests in 7 days.",
    xp_bonus: 300,
    hidden: false,
    category: "event",
  },

  // ── Recovery ──────────────────────────────────────────────────────────────
  {
    key: "phoenix",
    name: "Phoenix",
    description: "Rebuild a streak to 14+ days after a death tax.",
    hint: "Rise from the ashes.",
    xp_bonus: 500,
    hidden: false,
    category: "recovery",
    unlocks_title: "Phoenix",
  },
  {
    key: "phoenix_rising",
    name: "Phoenix Rising",
    description: "Rebuild a streak to 30+ days after a death tax.",
    hint: "Keep rising.",
    xp_bonus: 1500,
    hidden: false,
    category: "recovery",
  },

  // ── Hidden ────────────────────────────────────────────────────────────────
  {
    key: "the_grind",
    name: "The Grind",
    description: "Hit the diminishing returns floor on any quest.",
    hint: "Repetition is the mother of mastery.",
    xp_bonus: 250,
    hidden: true,
    category: "hidden",
  },
  {
    key: "rock_bottom",
    name: "Rock Bottom",
    description: "Suffer a death tax on a 60+ day streak.",
    hint: "Everything has a cost.",
    xp_bonus: 500,
    hidden: true,
    category: "hidden",
  },
  {
    key: "comeback_kid",
    name: "Comeback Kid",
    description: "Recover from 3 death taxes total.",
    hint: "Some people just keep getting back up.",
    xp_bonus: 1000,
    hidden: true,
    category: "hidden",
  },
  {
    key: "deathwalker",
    name: "Deathwalker",
    description: "Suffer 3 death taxes in a row without a 30+ day streak between them.",
    hint: "Consistency has a habit of eluding you.",
    xp_bonus: 2500,
    hidden: true,
    category: "hidden",
    unlocks_title: "Deathwalker",
  },
  {
    key: "marathon_session",
    name: "Marathon Session",
    description: "Complete 8+ quests in a single day.",
    hint: "One quest was never enough.",
    xp_bonus: 1000,
    hidden: true,
    category: "hidden",
  },
  {
    key: "the_balanced",
    name: "The Balanced",
    description: "All stats within 3 levels of each other, all at level 15+.",
    hint: "Harmony across all things.",
    xp_bonus: 3000,
    hidden: true,
    category: "hidden",
    unlocks_title: "The Balanced",
  },
];

// ── Stat Titles ───────────────────────────────────────────────────────────────

export const STAT_TITLES: Record<StatName, Array<{ level: number; title: string }>> = {
  STR: [
    { level: 5, title: "Iron Novice" },
    { level: 10, title: "Forge-Hardened" },
    { level: 15, title: "Bull" },
    { level: 20, title: "Ironback" },
    { level: 25, title: "Colossus" },
    { level: 30, title: "Titan's Blood" },
    { level: 40, title: "Mountain" },
    { level: 50, title: "Earthshaker" },
  ],
  END: [
    { level: 5, title: "Pacer" },
    { level: 10, title: "Steady" },
    { level: 15, title: "Relentless" },
    { level: 20, title: "Marathoner" },
    { level: 25, title: "Untiring" },
    { level: 30, title: "Unbroken" },
    { level: 40, title: "Eternal" },
    { level: 50, title: "Immortal Engine" },
  ],
  DEX: [
    { level: 5, title: "Nimble" },
    { level: 10, title: "Quick" },
    { level: 15, title: "Agile" },
    { level: 20, title: "Blade" },
    { level: 25, title: "Phantom" },
    { level: 30, title: "Wraith" },
    { level: 40, title: "Tempest" },
    { level: 50, title: "Lightning" },
  ],
  INT: [
    { level: 5, title: "Curious" },
    { level: 10, title: "Studious" },
    { level: 15, title: "Sharp" },
    { level: 20, title: "Learned" },
    { level: 25, title: "Lorekeeper" },
    { level: 30, title: "Architect" },
    { level: 40, title: "Mastermind" },
    { level: 50, title: "Polymath Prime" },
  ],
  WIS: [
    { level: 5, title: "Mindful" },
    { level: 10, title: "Thoughtful" },
    { level: 15, title: "Insightful" },
    { level: 20, title: "Sage" },
    { level: 25, title: "Oracle" },
    { level: 30, title: "Seer" },
    { level: 40, title: "Prophet" },
    { level: 50, title: "Omniscient" },
  ],
  CHA: [
    { level: 5, title: "Tidy" },
    { level: 10, title: "Keeper" },
    { level: 15, title: "Steward" },
    { level: 20, title: "Warden" },
    { level: 25, title: "Pillar" },
    { level: 30, title: "Bastion" },
    { level: 40, title: "Sovereign" },
    { level: 50, title: "Lord of Hearth" },
  ],
};

/** All stat titles currently earned based on current stat levels */
export function getEarnedStatTitles(
  stats: Array<{ stat_name: StatName; level: number }>
): string[] {
  const earned: string[] = [];
  for (const stat of stats) {
    const milestones = STAT_TITLES[stat.stat_name];
    for (const { level, title } of milestones) {
      if (stat.level >= level) earned.push(title);
    }
  }
  return earned;
}

/** Which special titles are unlocked by specific achievement keys */
export const ACHIEVEMENT_TITLE_MAP: Record<string, string> = {
  streak_90: "Unkillable",
  phoenix: "Phoenix",
  deathwalker: "Deathwalker",
  the_balanced: "The Balanced",
};

/** Lookup a definition by key */
export function getAchievementDef(key: string): AchievementDef | undefined {
  return ACHIEVEMENT_DEFS.find((a) => a.key === key);
}
