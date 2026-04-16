# OVERCLOCK — Design Document

**Life RPG Application**
**Version 2.0 — Comprehensive Design**
**March 2026 | Living Document**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Core RPG Systems](#3-core-rpg-systems)
4. [Streak System](#4-streak-system)
5. [Quest System](#5-quest-system)
6. [Mood System](#6-mood-system)
7. [AI Layer](#7-ai-layer)
8. [Skill Trees](#8-skill-trees)
9. [Titles & Ranks](#9-titles--ranks)
10. [Achievements](#10-achievements)
11. [System Visualisation & Character Scan](#11-system-visualisation--character-scan)
12. [Data Model](#12-data-model)
13. [PWA Configuration](#13-pwa-configuration)
14. [Open Questions](#14-open-questions)
15. [Development Phases](#15-development-phases)

---

## 1. Project Overview

### 1.1 Purpose

Overclock is a personal life RPG that gamifies fitness, household tasks, projects, and personal development through deep RPG mechanics. The core conceit: you are accessing the mainframe of your own body — an internal operating system that surfaces missions, diagnostics, and system status hidden from normal perception. Every real-world action translates to measurable system upgrades, with mechanics that reward consistency, punish stagnation, and force genuine growth.

No social component. No leaderboards, no friends list, no feed. Single-player only. You are the system. The app is the backend.

### 1.2 Secondary Purpose

Technical learning exercise. The stack mirrors the planned OSHC SaaS product (Next.js, TypeScript, Tailwind, Supabase), providing hands-on experience before the commercial build.

### 1.3 Platform

Progressive Web App (PWA) targeting Android. Installable from browser, offline-capable for core logging.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 14+ (App Router) | React-based, server components where appropriate |
| Language | TypeScript | Strict mode, shared types client/server |
| Styling | Tailwind CSS | Utility-first, dark theme default |
| Database | Supabase (PostgreSQL) | Auth, DB, storage, real-time |
| Auth | Supabase Auth | Single-user v1, magic link or email/password |
| AI — Quests | Anthropic Claude API (Sonnet) | Quest generation, coaching, pattern analysis |
| AI — Portrait | TBD (Stable Diffusion / DALL-E / Flux) | Character portrait evolution |
| Hosting | Vercel | Free tier sufficient for personal use |
| PWA | next-pwa or Serwist | Service worker, offline, install prompt |

---

## 3. Core RPG Systems

### 3.1 Stats

Six core stats. Every quest assigns XP to one primary stat (multi-stat quests possible via cross-stat specialisations — see Section 8).

| Stat | Abbr | Feeds From | Examples |
|------|------|-----------|----------|
| Strength | STR | Resistance training, heavy physical work | Deadlifts, moving furniture, carrying kids |
| Endurance | END | Cardio, sustained effort | Running, cycling, long hikes, swimming |
| Dexterity | DEX | Mobility, skill-based movement, sport | Stretching, martial arts, climbing, yoga |
| Intelligence | INT | Learning, projects, technical work | Coding, reading, study, building things |
| Wisdom | WIS | Reflection, planning, admin, finances | Budgeting, planning, journaling, meal prep |
| Charisma | CHA | Social tasks, household, life maintenance | Cleaning, cooking, errands, organising |

Each stat levels independently. Character level derives from total aggregate XP across all stats.

### 3.2 XP Model

**Base XP** is set per quest by the user, within a range determined by difficulty tier.

| Tier | Label | Base XP Range | Example |
|------|-------|--------------|---------|
| 1 | Trivial | 10–25 | 5-min tidy, quick stretch |
| 2 | Easy | 25–75 | 30-min walk, load dishwasher |
| 3 | Moderate | 75–150 | Full gym session, deep clean a room |
| 4 | Hard | 150–300 | Heavy PR attempt, complete a project milestone |
| 5 | Epic | 300–500 | Race/competition, ship a major feature |

**XP earned per completion:**

```
XP = Base XP × Volume Multiplier × Streak Multiplier × Diminishing Returns Factor
```

### 3.3 Volume Scaling (Fitness Quests)

For detailed-logged resistance training, XP scales with tonnage:

```
Volume Multiplier = actual_tonnage / baseline_tonnage
```

Where `baseline_tonnage` is calibrated to the user's current stat level and recalibrates as the stat levels up. This means the same workout yields less XP as you get stronger — you must lift more to earn the same reward.

**Baseline recalibration:** Every time a stat levels up, the baseline tonnage shifts upward by a percentage (tunable, starting at 5%). This is the core "scales with you" mechanic.

For quick-logged quests: no volume calculation. Difficulty tier determines XP directly.

### 3.4 Diminishing Returns

Repeating the same quest at the same intensity yields progressively less XP. Tracked over a rolling window of the last 14 completions of each quest.

```
Decay Factor = max(0.25, 1 − (0.05 × same_intensity_count))
```

| Repetition # | Decay Factor | Effective XP (100 base) |
|-------------|-------------|------------------------|
| 1 | 1.00 | 100 |
| 5 | 0.80 | 80 |
| 10 | 0.55 | 55 |
| 15+ | 0.25 | 25 (floor) |

**Reset conditions:** Increase intensity (more weight, harder tier), vary the quest, or level up the stat (recalibrates baselines). You cannot grind the same easy task forever.

### 3.5 Levelling Curve

Exponential. Each level requires more XP. Applies independently to each stat and to character level.

```
XP required for level N = floor(100 × N^1.5)
```

| Level | XP Required | Cumulative XP | Approx. Real-World Effort |
|-------|------------|---------------|--------------------------|
| 1 | 100 | 100 | A few easy tasks |
| 5 | 1,118 | 3,382 | ~1–2 weeks regular activity |
| 10 | 3,162 | 13,352 | ~1 month consistent |
| 20 | 8,944 | 52,057 | ~3 months solid |
| 50 | 35,355 | 335,410 | ~1 year dedicated |
| 100 | 100,000 | 1,338,103 | Multi-year commitment |

**Tuning levers:** Base constant (100), exponent (1.5), and quest tier XP ranges. All will need adjustment after 2–4 weeks of real use.

---

## 4. Streak System

### 4.1 Streak Multiplier

Consecutive days logging at least one quest builds a streak. The streak multiplies all XP earned:

| Streak Days | Multiplier | Effect |
|------------|-----------|--------|
| 1–3 | 1.0× | No bonus (building momentum) |
| 4–7 | 1.1× | First week reward |
| 8–14 | 1.25× | Two-week consistency |
| 15–30 | 1.5× | Habit formation payoff |
| 31–60 | 1.75× | Serious commitment |
| 61–90 | 2.0× | Double XP |
| 91+ | 2.5× | Maximum, sustained excellence |

### 4.2 Death Tax

Breaking a streak incurs an XP penalty within the current character level. The penalty scales with the length of the broken streak — longer streaks hurt more.

```
Death Tax = floor(streak_days × 15 × log₂(streak_days + 1))
```

| Broken Streak | XP Penalty | Approx. Recovery |
|--------------|-----------|-----------------|
| 3 days | 90 XP | A couple of moderate quests |
| 7 days | 315 XP | A solid day of activity |
| 14 days | 819 XP | 2–3 days consistent effort |
| 30 days | 2,214 XP | ~1 week grinding back |
| 60 days | 5,340 XP | ~2 weeks to recover |
| 90 days | 8,879 XP | ~3 weeks, significant setback |

**Rules:**
- Cannot lose levels — penalty floors at 0 XP within current level
- Must earn back lost XP before progressing toward next level
- Death tax is logged in streak history for AI analysis (pattern detection)

**Design intent:** The tax stings but never feels unrecoverable. It should motivate rebuilding, not quitting. Tuning levers: the constant (15) and log base.

---

## 5. Quest System

### 5.1 Quest Types

| Type | Description | Example |
|------|-----------|---------|
| Repeatable | Completed multiple times. Core daily/weekly activities. | "Gym Session", "Kitchen Clean" |
| One-off | Single completion. Project milestones, specific goals. | "Set up Supabase project", "Fix bathroom tap" |
| Timed | Has a deadline. Bonus XP if early, no penalty if late. | "Finish design doc by Friday" |
| Chain | Linked sequence forming a larger goal (see 5.4). | "Week 1 → Week 4 running program" |

### 5.2 Quest Definition

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | String | Yes | Short, descriptive |
| Stat | Enum (STR/END/DEX/INT/WIS/CHA) | Yes | Primary stat |
| Difficulty Tier | 1–5 | Yes | Sets base XP range |
| Base XP | Number | Yes | Within tier range |
| Quest Type | Repeatable / One-off / Timed / Chain | Yes | See 5.1 |
| Logging Mode | Detailed / Quick | Yes | Detailed: reps/sets/weight. Quick: tap to complete |
| Deadline | Date | Timed only | — |
| Notes | String | No | Personal context |
| Tags | String[] | No | For filtering, AI context |

### 5.3 Quest Logging

**Quick Mode:** Tap to complete. Records timestamp, awards base XP modified by streak and diminishing returns. Used for cleaning, errands, quick workouts, project tasks.

**Detailed Mode:** Log exercises with sets, reps, weight. Calculates tonnage, applies volume multiplier. Used for resistance training or any activity where intensity is quantifiable.

The AI layer receives both types. Quick logs give frequency/consistency patterns. Detailed logs give progression data.

### 5.4 Quest Chains

Linked sequences of quests forming a larger goal. Completing all quests in a chain awards a chain completion bonus (1.5× the sum of individual quest XP).

Example: A 4-week running program where each week's distance increases. Individual quests earn XP, and completing the full chain earns a lump-sum bonus.

Chains can be user-defined or AI-suggested (the Coach Me system can propose chains based on identified weaknesses).

---

## 6. Mood System

### 6.1 Input Method

A 2×2 grid. Two axes: Energy (low/high) and Motivation (low/high). Single tap. No emotion words. No introspection.

|  | Low Motivation | High Motivation |
|--|---------------|----------------|
| **High Energy** | Restless | Let's Go |
| **Low Energy** | Dragging | Willing But Tired |

Appears as a prompt when opening the app. Dismissible instantly.

### 6.2 Skip-as-Signal

Skipping is a tracked data point. Consecutive skips (3+) are a disengagement signal. The AI uses this:

- Frequent skips → lower-friction quest suggestions
- Skip after a streak break → potential spiral detection, gentler prompts
- Resumed mood logging after skips → positive signal, AI can acknowledge

### 6.3 Boundaries

This is not a mental health tool. It's a game mechanic for quest calibration. The AI should never attempt therapy, diagnosis, or emotional support beyond adjusting quest difficulty. The mood input is functionally identical to a game's difficulty slider.

---

## 7. AI Layer

### 7.1 Architecture

Two tiers:

**Rules Engine (always active):** Deterministic pattern detection on local data. Runs client-side, no API calls. Handles:
- Daily suggested quests from the user's quest library
- Lagging stat identification (suggest quests for underlevelled stats)
- Streak risk warnings
- Stagnation detection (flagging quests hitting diminishing returns floor)
- Time-based patterns (e.g. user always skips weekends)

**Claude API (on demand):** Triggered by "Coach Me" button. Provides:
- Personalised quest suggestions with reasoning
- Pattern analysis the rules engine can't catch
- Quest chain proposals
- Strategic advice on stat balancing
- Acknowledgement of progress or setbacks (direct, not sycophantic)

### 7.2 AI Payload

Data sent to Claude on "Coach Me":

| Data | Purpose |
|------|---------|
| Current stat levels and XP | Overall progression and balance |
| Last 14 days of quest completions | Recent patterns and consistency |
| Current streak length and multiplier | Streak context, risk assessment |
| Last 5 mood entries (including skips) | Energy/motivation estimation |
| Diminishing returns flags | Which quests are stagnating |
| Quest library (active quests) | Available activities to suggest |
| Active skill tree nodes | Specialisation context |
| Recent achievements unlocked | Progress momentum |
| Time of day and day of week | Contextual appropriateness |
| Active spec (name, focus areas, primary stats) | Current declared priorities |
| Days since last respec, token status | Spec commitment context |
| Death tax history (last 3) | Recovery pattern analysis |

### 7.3 AI System Prompt (Draft)

```
You are a quest master for a life RPG called Overclock. Your player has 
provided their current state. Your job is to generate 3–5 quests that:

1. Address stat imbalances (suggest activities for lagging stats)
2. Push progression (don't suggest things they've been grinding at the 
   same intensity — check diminishing returns flags)
3. Match current energy/motivation (don't suggest epic quests when 
   they're dragging; don't suggest trivial quests when they're fired up)
4. Protect or rebuild streaks (if streak is at risk, suggest achievable 
   quests to maintain it)
5. Advance active skill tree branches where possible
6. Consider quest chains if the player needs direction

Tone: Direct and practical. No motivational fluff. No cheerleading. 
The player prefers realism. If they're in a hole, acknowledge it 
plainly and give them a concrete ladder out.

If mood data shows consecutive skips, treat this as disengagement. 
Suggest the lowest-friction possible quests — things that take under 
5 minutes. The goal is to get them logging anything, not to push hard.

Format: Return quests as structured JSON with fields: name, stat, 
difficulty_tier, base_xp, reasoning (1 sentence explaining why this 
quest right now).
```

### 7.4 Cost Estimation

~1,000 input tokens + ~500 output tokens per call using Claude Sonnet. Approximately $0.004 per "Coach Me" tap. Daily use = ~$0.12/month.

---

## 8. Skill Trees

### 8.1 Overview

Two types of skill trees that layer on top of the base stat system:

1. **Stat Branches** — specialisations within a single stat
2. **Cross-Stat Specialisations** — hybrid paths requiring multiple stats

Skill tree nodes provide passive bonuses: XP multipliers for specific quest types, reduced diminishing returns in a niche, or unlocking new quest categories.

### 8.2 Stat Branches

Each stat branches into 2–3 specialisations. Unlocked when the parent stat reaches level 10. Investing in a branch does not lock out other branches — you can spread points or focus.

**Branch XP:** A percentage of XP earned in the parent stat flows into the active branch based on quest tags. E.g. a quest tagged "powerlifting" under STR routes branch XP to the Power branch.

#### STR Branches

| Branch | Focus | Unlocks / Bonuses |
|--------|-------|-------------------|
| Power | Max effort, low rep, heavy | 1.15× XP for quests involving weight >80% estimated max |
| Hypertrophy | Volume, moderate load | Reduced diminishing returns on high-volume sessions |
| Functional | Carries, odd objects, real-world | Bonus XP when STR quests are tagged with real-world tasks |

#### END Branches

| Branch | Focus | Unlocks / Bonuses |
|--------|-------|-------------------|
| Aerobic | Sustained low-moderate effort | Duration-based XP scaling improves |
| Anaerobic | Sprints, intervals, high intensity | Bonus XP for short-duration high-intensity sessions |
| Resilience | Mental endurance, discomfort tolerance | Reduced death tax penalty (10% reduction) |

#### DEX Branches

| Branch | Focus | Unlocks / Bonuses |
|--------|-------|-------------------|
| Mobility | Flexibility, joint health | Bonus XP for stretching/mobility quests |
| Combat | Martial arts, contact sport | Unlocks dual-stat XP split with STR for combat quests |
| Precision | Fine motor, skill-based sport | Bonus XP for skill-practice quests |

#### INT Branches

| Branch | Focus | Unlocks / Bonuses |
|--------|-------|-------------------|
| Builder | Coding, making, creating | Bonus XP for project-type quests |
| Scholar | Reading, study, courses | Reduced diminishing returns on learning quests |
| Strategist | Problem-solving, planning | Unlocks dual-stat XP split with WIS |

#### WIS Branches

| Branch | Focus | Unlocks / Bonuses |
|--------|-------|-------------------|
| Planner | Organisation, systems, admin | Bonus XP for planning/admin quests |
| Financial | Budgeting, investing, money | Unlocks finance-specific quest category |
| Reflective | Journaling, review, mindfulness | Streak multiplier builds 1 day faster |

#### CHA Branches

| Branch | Focus | Unlocks / Bonuses |
|--------|-------|-------------------|
| Domestic | Cleaning, cooking, home maintenance | Bonus XP for household quests |
| Social | Relationships, networking, presence | Bonus XP for social-interaction quests |
| Leadership | Managing, mentoring, teaching | Unlocks dual-stat XP split with INT or WIS |

### 8.3 Cross-Stat Specialisations

Hybrid paths that unlock when two or more stats reach a threshold. These represent emergent identities — the kind of person you become when multiple areas are strong.

| Specialisation | Requirements | Theme | Bonus |
|---------------|-------------|-------|-------|
| Ironman | STR 20 + END 20 | Complete athlete | 1.2× XP for any physical quest (STR/END/DEX) |
| Warrior | STR 20 + DEX 15 | Combat readiness | Reduced diminishing returns on all physical quests |
| Polymath | INT 20 + WIS 15 | Renaissance mind | 1.15× XP for INT and WIS quests |
| Architect | INT 20 + CHA 15 | Builder of systems and spaces | Bonus XP for project + household combo weeks |
| Stoic | END 15 + WIS 20 | Mental and physical resilience | Death tax reduced by 20% |
| Renaissance | All stats ≥ 15 | Balanced excellence | 1.1× XP on everything, permanently |
| Titan | All stats ≥ 30 | Late-game prestige | 1.25× XP on everything, unique portrait modifier |
| Ascendant | All stats ≥ 50 | Endgame | 1.5× XP, unique title, portrait transformation |

Cross-stat specialisations are permanent once unlocked (you can't lose them even if a stat drops due to rebalancing — they're earned milestones).

### 8.4 Skill Points

Skill points are awarded at stat level-ups. 1 point per stat level gained, spent on nodes within that stat's branch tree. Cross-stat specialisations don't cost points — they unlock automatically when requirements are met.

Node costs increase deeper into the tree (1 → 2 → 3 → 5 points per node). This means early branches are cheap to sample, but deep specialisation requires commitment.

### 8.5 Specs (Active Focus)

#### Concept

A spec is a declared focus path — a temporary commitment that tells the system what you're currently trying to become. Unlike branches (permanent investment) and specialisations (milestone unlocks), specs are rotational. They represent your current season of focus, not your lifetime identity.

#### How It Works

1. **The player tells the AI what they want to work on.** Free text, whatever's on their mind. E.g. "Buhurt strength and conditioning, building apps, learning Norwegian, cardio, cooking, and game design."

2. **The AI analyses the stated goals** against current stats, identifies natural pairings that complement each other, and generates **3 spec options** — each bundling 2–3 of the player's interests into a coherent focus path.

3. **The player picks one.** That becomes the active spec.

#### Example

Player input: "Buhurt S&C, building apps, learning Norwegian, cardio, cooking, game design"

AI-generated spec options:

| Spec Name | Focus Areas | Primary Stats |
|-----------|------------|---------------|
| Warrior-Builder | Buhurt S&C + App Development | STR, DEX, INT |
| Endurance Scholar | Cardio + Norwegian + Game Design | END, INT |
| Hearth & Craft | Cooking + App Development + Game Design | CHA, INT |

#### Mechanical Effects

Active spec provides soft bonuses — it doesn't lock the player out of anything.

| Effect | Detail |
|--------|--------|
| XP Bonus | 1.15× XP on quests aligned with the spec's focus areas |
| Diminishing Returns | Eased slightly within the spec's domain (decay factor floor raised from 0.25 to 0.35) |
| AI Quest Weighting | Coach Me suggestions favour spec-relevant quests |
| Portrait Emphasis | Active spec biases portrait generation toward the spec's primary stats |

#### Respec Tokens

The player cannot freely swap specs. Commitment matters.

| Rule | Detail |
|------|--------|
| First spec | Free — selected during onboarding or first AI interaction |
| Respec token | 1 token earned every 30 days of active spec commitment |
| Token cap | Maximum of 1 token held at a time |
| Using a token | Triggers new AI spec generation based on updated goals |
| No token, no respec | If you just respecced, you're locked in for at least 30 days |

This means: if you're happy with your spec, you earn a token and bank it. When you're ready for a change, you spend it and get new options. But you can never stockpile flexibility — 1 max means you always need at least a month of commitment since your last change.

#### AI Integration

The spec system enhances the AI layer significantly. With an active spec, the Coach Me function has explicit context about the player's priorities rather than inferring from patterns. The AI payload (Section 7.2) includes the active spec, its focus areas, days since last respec, and whether the player has a banked token.

If the player has a banked token and is showing signs of disengagement with their current spec (declining quest completion in spec-aligned areas, mood skips), the AI can proactively suggest a respec as part of its coaching — "You haven't touched your Warrior-Builder goals in 2 weeks. Want to reassess your spec?"

---

## 9. Titles & Ranks

### 9.1 Stat Titles

Earned at stat milestones. Displayed on the character profile. The player chooses one active title at a time.

| Level | STR | END | DEX | INT | WIS | CHA |
|-------|-----|-----|-----|-----|-----|-----|
| 5 | Iron Novice | Pacer | Nimble | Curious | Mindful | Tidy |
| 10 | Forge-Hardened | Steady | Quick | Studious | Thoughtful | Keeper |
| 15 | Bull | Relentless | Agile | Sharp | Insightful | Steward |
| 20 | Ironback | Marathoner | Blade | Learned | Sage | Warden |
| 25 | Colossus | Untiring | Phantom | Lorekeeper | Oracle | Pillar |
| 30 | Titan's Blood | Unbroken | Wraith | Architect | Seer | Bastion |
| 40 | Mountain | Eternal | Tempest | Mastermind | Prophet | Sovereign |
| 50 | Earthshaker | Immortal Engine | Lightning | Polymath Prime | Omniscient | Lord of Hearth |

### 9.2 Special Titles

Earned through cross-stat specialisations, achievements, or specific milestones:

| Title | Requirement | Flavour |
|-------|------------|---------|
| The Balanced | All stats ≥ 10 | Jack of all trades |
| Deathwalker | Recovered from 3+ death taxes in a row | Keeps getting back up |
| Unkillable | 90-day streak | Consistency incarnate |
| Phoenix | Rebuilt a 60+ day streak after a break | Rose from the ashes |
| Completionist | 500 total quests completed | Volume player |
| Ghost | 30-day streak with no mood logs | Silent operator |
| Specialist | Any single stat 20 levels above lowest stat | Deep focus |
| Ascendant | All stats ≥ 50 | Endgame prestige |

---

## 10. Achievements

### 10.1 Achievement Philosophy

Achievements should surprise. The best ones are discovered, not telegraphed. The system has visible achievements (shown in a trophy case with clear requirements) and hidden achievements (requirements obscured until unlocked, with only a cryptic hint visible).

Some achievements reward grinding. Some reward creativity. Some reward failure and recovery. Some reward things the player didn't even know were being tracked.

### 10.2 Achievement Categories

#### Milestone Achievements

Straightforward stat and quest milestones. Visible requirements.

| Achievement | Requirement | XP Bonus |
|------------|------------|----------|
| First Blood | Complete your first quest | 50 |
| Decathlon | Reach level 10 in any stat | 500 |
| Century | Complete 100 quests | 1,000 |
| Half-Millennium | Complete 500 quests | 5,000 |
| The Thousand | Complete 1,000 quests | 15,000 |
| Well-Rounded | All stats at level 5+ | 750 |
| Balanced Force | All stats at level 10+ | 2,000 |
| Perfectionist | All stats at level 25+ | 10,000 |
| Max Level (per stat) | Reach level 50 in a stat | 25,000 |
| Grandmaster | Reach character level 100 | 100,000 |

#### Streak Achievements

| Achievement | Requirement | XP Bonus |
|------------|------------|----------|
| Getting Started | 7-day streak | 100 |
| Two Weeks Strong | 14-day streak | 300 |
| Monthly | 30-day streak | 750 |
| Iron Will | 60-day streak | 2,000 |
| Unkillable | 90-day streak | 5,000 |
| The Long Road | 180-day streak | 15,000 |
| Year One | 365-day streak | 50,000 |

#### Event-Triggered Achievements

Triggered by specific actions, combinations, or patterns. Mix of visible and hidden.

| Achievement | Requirement | Hidden? | XP Bonus |
|------------|------------|---------|----------|
| Dawn Warrior | Complete a quest before 6 AM | No | 100 |
| Night Owl | Complete a quest after 11 PM | No | 100 |
| Double Tap | Complete 2 quests from different stats in one day | No | 150 |
| Pentathlon | Complete quests in 5 different stats in one day | No | 500 |
| Full Sweep | Complete quests in all 6 stats in one day | No | 1,000 |
| PR Day | Log a new personal record (tonnage) | No | 250 |
| PR Streak | Hit PRs in 3 consecutive gym sessions | Yes | 1,000 |
| Variety Pack | Complete 10 different quests in 7 days | No | 300 |
| Specialist Run | Complete the same quest 20 times | No | 200 |
| Quest Creator | Create 25 custom quests | No | 250 |

#### Recovery & Resilience Achievements

Rewarding failure, recovery, and persistence. These are the most important category thematically.

| Achievement | Requirement | Hidden? | XP Bonus |
|------------|------------|---------|----------|
| Phoenix | Rebuild a streak to 14+ days after a death tax | No | 500 |
| Phoenix Rising | Rebuild a streak to 30+ days after a death tax | No | 1,500 |
| Comeback Kid | Recover from 3 death taxes total | Yes | 1,000 |
| Deathwalker | Recover from 3 death taxes in a row (no 30+ day streak between) | Yes | 2,500 |
| Rock Bottom | Suffer a death tax on a 60+ day streak | Yes | 500 |
| Unbreakable | Reach a 90-day streak after previously suffering a death tax on a 30+ day streak | Yes | 5,000 |
| What Doesn't Kill You | Total death tax XP paid exceeds 10,000 | Yes | 3,000 |

#### Hidden / Discovery Achievements

Requirements are completely hidden. Player only sees a locked icon with a cryptic hint until unlocked.

| Achievement | Hint Shown | Actual Requirement | XP Bonus |
|------------|-----------|-------------------|----------|
| The Machine | "Consistency has a frequency." | Complete at least 1 quest every single day for a calendar month (all 28–31 days) with no mood log | 2,000 |
| Balanced Diet | "Harmony across all things." | Have all 6 stats within 3 levels of each other at level 15+ | 3,000 |
| Night Shift | "The world sleeps. You don't." | Complete 10 quests between midnight and 5 AM (cumulative, not consecutive) | 500 |
| Marathon Session | "One quest was never enough." | Complete 8+ quests in a single day | 1,000 |
| The Grind | "Repetition is the mother of mastery." | Hit the diminishing returns floor (0.25×) on any quest | 250 |
| Efficiency Expert | "More from less." | Earn 1,000+ XP in a single day from only 2 quests | 750 |
| Silent Streak | "Actions speak louder." | Maintain a 14-day streak while skipping every mood check | 500 |
| Monday Person | "Everyone else dreads it." | Complete a quest every Monday for 12 consecutive weeks | 1,500 |
| The Collector | "Gotta catch 'em all." | Unlock 25 other achievements | 5,000 |
| Prestige | "There's always another level." | Reach character level 50 | 10,000 |

#### Cumulative / Long-Game Achievements

Tracked in the background over the lifetime of the account. Player doesn't know the exact thresholds.

| Achievement | Hint Shown | Actual Requirement | XP Bonus |
|------------|-----------|-------------------|----------|
| Tonnage Club | "Heavy is the crown." | Cumulative lifetime tonnage exceeds 100,000 kg | 5,000 |
| Mega Tonnage | "Atlas shrugs." | Cumulative lifetime tonnage exceeds 500,000 kg | 15,000 |
| Time Served | "It adds up." | Cumulative logged activity duration exceeds 500 hours | 5,000 |
| Lifer | "It adds up... more." | Cumulative logged activity duration exceeds 2,000 hours | 20,000 |
| Quest Factory | "You've built a life." | Total quest completions exceed 2,500 | 10,000 |
| XP Millionaire | "Numbers go up." | Total lifetime XP earned exceeds 1,000,000 | 25,000 |
| Tax Collector | "Death and taxes." | Total lifetime death tax paid exceeds 25,000 XP | 5,000 |

### 10.3 Achievement Rewards

Achievements award a one-time XP bonus (added to character XP, not a specific stat). Some achievements also unlock:

- **Titles** (see Section 9)
- **Portrait modifiers** (visual elements added to the character portrait — see Section 11)
- **Cosmetic badges** displayed on the profile

Achievement XP is not subject to diminishing returns or streak multipliers — it's a flat bonus.

---

## 11. System Visualisation & Character Scan

### 11.1 Core Concept

The player is not looking at a character. They are **accessing the mainframe of their own body** — an internal operating system that surfaces missions, diagnostics, and system status that would be hidden to a normal person. The entire app is framed as a backend terminal into the self.

The "portrait" is not a portrait. It's a **diagnostic scan** — a humanoid silhouette rendered as a schematic/wireframe/system readout, with subsystems lighting up, degrading, and evolving based on stats. Think: a machine that happens to look like a human in shape, rendered by the system's internal scanner. Not ultra-detailed. Functional. Readable. Like looking at an X-ray of your own upgrades.

### 11.2 Diagnostic Scan — Visual Language

The scan is a procedurally generated SVG/canvas render, not an AI-generated image. It updates in real-time as stats change. Zero API cost, perfect consistency, instant feedback.

| Stat | Subsystem Visualised | Low Level | High Level |
|------|---------------------|-----------|------------|
| STR | Musculoskeletal reinforcement | Faint outline of muscle groups, minimal highlighting | Dense reinforcement lattice, glowing power conduits along limbs, exoskeleton scaffolding visible |
| END | Cardiovascular / cooling systems | Basic circulatory trace, dim | Extensive cooling network, heat sink nodes at joints, cardiovascular system pulsing bright |
| DEX | Neural reflex pathways | Sparse nerve traces along spine and limbs | Dense reflex wiring, branching pathways lit up across entire body, motion-trail afterimage |
| INT | Neural processing array | Single dim node at the skull | Complex neural web radiating from cranium, data streams flowing, processing nodes across cortex |
| WIS | Sensory / awareness field | Tight scan radius around the figure | Wide ambient awareness field radiating outward, third-eye sensor node, environmental data overlay |
| CHA | External interface layer | Raw chassis, unfinished surface | Polished exterior shell, insignia/rank markers, command-authority broadcast indicators |

### 11.3 Scan Rendering

The scan is built from layers:

1. **Base silhouette** — humanoid wireframe outline, always present, dark with faint grid lines
2. **Subsystem overlays** — one per stat, each a different accent colour, intensity scales with stat level
3. **Spec highlight** — active spec's primary stats pulse slightly brighter than others
4. **Status indicators** — streak status, active buffs/debuffs, death tax damage shown as visual artefacts (cracked/flickering sections)
5. **Achievement marks** — small glyphs or symbols that appear on the scan when achievements are unlocked (e.g. Phoenix mark glows at the chest, Unkillable mark at the wrists)

**Colour mapping:**

| Stat | Scan Colour |
|------|------------|
| STR | Red/amber |
| END | Deep orange |
| DEX | Cyan |
| INT | Electric blue |
| WIS | Violet |
| CHA | Gold |

At low stat levels, the subsystem is barely visible — faint traces on the wireframe. As stats increase, the subsystem becomes denser, brighter, more complex. A fully maxed stat has its subsystem dominating that region of the body with intricate detail.

### 11.4 Milestone Portraits (AI-Generated)

The diagnostic scan is the daily view. But at **major milestones**, the system generates a full cinematic render — an AI-generated image of the machine-self at that moment in time. These are rare rewards, not routine.

**Triggers:**
- Character level 10, 25, 50, 75, 100
- Cross-stat specialisation unlocked
- Ascendant achievement (all stats ≥ 50)
- First 365-day streak

**Prompt construction** for milestone portraits:

```
Base: "Dark retro cyberpunk diagnostic scan of a humanoid machine, 
dark synth aesthetic, neon accent lighting on deep black, 
wireframe-to-solid rendering, schematic overlay, the machine 
happens to look human in shape, not detailed face — system scan output"

+ Stat tier modifiers (based on current stat levels):
  - STR high: "dense musculoskeletal reinforcement lattice glowing red-amber"
  - INT high: "complex neural processing array radiating from cranium, blue circuit traces"
  - [etc. for each stat based on tier]

+ Achievement modifiers:
  - Phoenix: "ember glow beneath cracked chassis plating"
  - Unkillable: "integrity indicators all reading maximum despite visible wear"
  - Ascendant: "form partially dissolving into pure energy and data"

+ Active spec influences background environment/context
+ Active title rendered as system designation text
```

**Cost:** At ~5–8 milestone portraits across the full levelling journey, total lifetime cost is under $0.40.

### 11.5 Scan History

Every milestone portrait is stored. The diagnostic scan state is also snapshot at key moments (level-ups, spec changes, achievement unlocks). The player can scrub through a timeline of their system's evolution — a visual changelog of their self-modification journey.

### 11.6 App Visual Design

The entire app is the character's internal OS. You're not using an app that tracks a character — you **are** the system, and the UI is your backend.

**Framing metaphor:** Logging in to Overclock is accessing your own mainframe. Quests are missions surfaced by the system's analysis of your capabilities and weaknesses. Stats are subsystem performance metrics. The Coach Me button runs a deep diagnostic. The mood grid is a quick system status check.

| Element | Treatment |
|---------|-----------|
| Background | Deep charcoal/near-black, subtle grid or circuit-trace pattern |
| Accent colours | Neon cyan (primary), magenta (alerts/death tax), amber (XP/progress), green (streaks) |
| Typography | Clean mono or semi-mono for data, sans-serif for labels — terminal aesthetic but readable |
| Dashboard | System diagnostic layout — scan visualisation centre, stat readouts flanking, mission queue below |
| XP bars | Glowing neon fill with subtle pulse animation, styled as power/charge meters |
| Stat panels | Dark cards with circuit-trace borders, subsystem icons, performance graphs |
| Streak counter | Uptime counter aesthetic — system stability metric that intensifies visually with longer streaks |
| Death tax | Screen flickers/glitches — the system registers damage, subsystems briefly show red, scan shows cracked sections |
| Quest completion | Mission confirmed — brief neon flash, XP tick-up, subsystem highlight pulse |
| Level up | System upgrade sequence — full-screen surge effect, scan recalibrates, new subsystem detail appears |
| Mood grid | Quick system status — four quadrants, minimal, feels like a pre-mission readiness check |
| Coach Me button | "Run Diagnostic" — prominent, pulsing, activates the AI analysis layer |
| Spec display | Active spec shown as current mission protocol / operating mode |
| Achievement unlock | System notification — glitch-in animation, achievement glyph materialises on scan |
| Quest log | Mission briefing format — objectives, threat assessment (difficulty), reward projection (XP) |

**Reference touchpoints:**
- Darkest Dungeon (oppressive atmosphere, consequence weight)
- Cyberpunk 2077 UI (data overlays, augment menus, system diagnostic screens)
- Dead Cells (dark palette, neon accents)
- Perturbator / Carpenter Brut / GosT album art (dark synth visual language)
- Transistor (glowing circuit aesthetics, elegant sci-fi)
- TRON Legacy (internal system visualization, identity-as-program)
- Westworld diagnostic scenes (body-as-machine schematic)
- Iron Man HUD (system readouts overlaid on self)

---

## 12. Data Model (Supabase Schema)

### 12.1 Core Tables

Single-user for v1. Supabase Auth protects the API but no complex RLS needed.

| Table | Key Columns | Purpose |
|-------|------------|---------|
| profiles | id, username, character_level, total_xp, streak_days, streak_multiplier, last_active_date, active_title | Player state |
| stats | id, profile_id, stat_name (enum), level, current_xp, total_xp, baseline_tonnage | Per-stat progression |
| quests | id, profile_id, name, stat, difficulty_tier, base_xp, quest_type, logging_mode, is_active, deadline, notes, tags[] | Quest definitions |
| quest_logs | id, quest_id, profile_id, completed_at, xp_earned, xp_base, multiplier_applied, decay_factor, volume_data (JSONB), mood_at_completion | Completions |
| exercises | id, quest_log_id, exercise_name, sets, reps, weight_kg, tonnage | Detailed fitness logging |
| mood_logs | id, profile_id, logged_at, energy (enum), motivation (enum), was_skipped (bool) | Mood + skip tracking |
| streak_history | id, profile_id, streak_start, streak_end, max_days, death_tax_applied | Streak records |
| achievements | id, profile_id, achievement_key, unlocked_at, xp_awarded | Unlocked achievements |
| skill_nodes | id, profile_id, stat_name, branch_name, node_name, points_invested, unlocked_at | Skill tree progress |
| specialisations | id, profile_id, specialisation_name, unlocked_at | Cross-stat unlocks |
| portraits | id, profile_id, generated_at, prompt_used, image_url, stat_snapshot (JSONB), trigger_reason | Portrait history |
| specs | id, profile_id, spec_name, focus_areas (JSONB), primary_stats[], activated_at, is_active, respec_token_available, token_earned_at | Active focus spec |
| spec_history | id, profile_id, spec_name, focus_areas (JSONB), activated_at, deactivated_at, days_active | Past specs |

### 12.2 JSONB Usage

`volume_data` in quest_logs stores flexible exercise data:

```json
{
  "exercises": [
    {"name": "Deadlift", "sets": [{"reps": 5, "weight": 140}, {"reps": 5, "weight": 140}]},
    {"name": "Bench Press", "sets": [{"reps": 8, "weight": 80}]}
  ],
  "total_tonnage": 8500,
  "duration_minutes": 55
}
```

`stat_snapshot` in portraits stores the stat state at generation time:

```json
{
  "STR": {"level": 22, "tier": 3},
  "END": {"level": 15, "tier": 2},
  "DEX": {"level": 8, "tier": 1},
  "INT": {"level": 31, "tier": 4},
  "WIS": {"level": 18, "tier": 2},
  "CHA": {"level": 12, "tier": 2}
}
```

---

## 13. PWA Configuration

**Offline Support:** Service worker caches app shell and core assets. Quest logging works offline, syncs to Supabase on reconnection. Critical for gym environments with poor connectivity.

**Install Prompt:** Web app manifest with icons, splash screen, and theme colour. Native-feeling Android app from the home screen.

**Notifications:** Streak risk alerts ("You haven't logged today — your 14-day streak is at risk"). V1 can start with in-app banners; push notifications in a later pass.

**Background Sync:** Deferred sync for offline quest logs via the Background Sync API.

---

## 14. Open Questions

| Question | Options / Notes | Impact |
|----------|----------------|--------|
| XP formula constants | 100 × N^1.5 — may need flatter or steeper curve | Pacing of entire game |
| Diminishing returns window | 14 completions vs. 14 days — which feels better? | Stagnation punishment speed |
| Death tax severity | Current formula may over/under-punish at extremes | Motivation vs. quitting risk |
| Volume baseline calibration | How to set initial tonnage baselines? First session as calibration? | Early game feel |
| Rest day mechanic | Should scheduled rest days not break streaks? | Prevents punishing smart recovery |
| Multi-stat quest splitting | How to split XP between two stats? 50/50? 70/30 primary/secondary? | Affects stat balance |
| Skill point respec | Can you reallocate skill points? Cost? | Flexibility vs. commitment |
| Image gen provider | Stable Diffusion (self-hosted, free), DALL-E ($0.02-0.04/image), Flux | Cost, quality, consistency |
| Art style lock-in | Need to choose and commit early for portrait consistency | Visual identity |
| Achievement XP scaling | Current values are gut-feel. May need rebalancing. | Economy balance |
| Branch XP routing | How does the system know which branch a quest feeds? Tags? Manual? | UX friction |
| Obsidian vault integration | Read local .md files to feed AI quest generation from real projects/notes. Requires file system access on Android. | Transforms AI from generic to deeply personal |

---

## 15. Development Phases

Build order prioritised by dependency and learning value. Each phase is a deployable increment.

| Phase | Scope | Learning Focus |
|-------|-------|---------------|
| 0: Scaffold | Next.js project, TS config, Tailwind, Supabase connection, auth | Project setup, Supabase auth, env config |
| 1: Data Layer | Supabase schema, TypeScript types, basic CRUD for quests and logs | Supabase client, RLS, TS integration |
| 2: Quest System | Quest creation UI, quick logging, XP calculation, stat tracking | React forms, state management, business logic |
| 3: Dashboard | System diagnostic layout — scan visualisation, stat readouts, mission queue | Data visualisation, SVG/canvas, responsive layout |
| 4: Streak Engine | Streak tracking, multiplier, death tax logic | Date handling, background calculations |
| 5: Detailed Logging | Exercise logging UI, tonnage calc, volume scaling | Complex forms, JSONB handling |
| 6: Mood System | 2×2 grid (system status check), skip tracking, mood history | Simple UI, data patterns |
| 7: AI Integration | Claude API, "Run Diagnostic" button, quest generation | API integration, prompt engineering |
| 8: PWA | Service worker, offline, manifest, notifications | PWA APIs, caching strategies |
| 9: Skill Trees | Branch UI, skill points, node bonuses, cross-stat specialisations | Complex state, tree data structures |
| 9.5: Specs | AI spec generation, respec token system, spec bonuses | AI integration, token mechanics |
| 10: Titles & Achievements | Title system, achievement detection, trophy case UI | Event systems, background tracking |
| 11: System Scan | Procedural SVG/canvas diagnostic scan, stat-driven subsystem rendering | Procedural graphics, dynamic SVG |
| 11.5: Milestone Portraits | AI image gen for rare milestone moments, prompt construction | External API, prompt templating |
| 12: Obsidian Integration | Vault file access, AI reads notes/projects for quest generation context | File system API, AI context enrichment |
| 13: Polish | Animations, transitions, glitch effects, onboarding, data export | UX refinement |

---

*This is a living document. All formulas, XP values, and balance numbers are starting points that will be tuned through playtesting. The tuning levers are documented inline.*
