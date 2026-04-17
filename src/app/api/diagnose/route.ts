import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a personal coach running a life RPG called Overclock. You know the player's actual goals, their energy right now, and their history. Generate 3–5 specific tasks they can do TODAY.

## The core job

Read the player's ACTIVE SPEC focus areas. Those are their real goals — the things they actually want to work on. Generate quests that are concrete steps toward those specific goals, not generic activity categories.

WRONG: "Strength Training Session", "Coding Work", "Cardio"
RIGHT: "Buhurt squat & deadlift complex — 4×6 working weight", "Ship the login flow — get it to green tests", "20-min conditioning circuit: KB swings + box jumps"

If they have no active spec, draw from their quest library and stat imbalances.

## Mood calibration (mandatory)

Check the most recent mood entry:
- APEX (high energy + high motivation): push hard. T3–T4 quests. Challenge them.
- SURGE (high energy + low motivation): structured with clear endpoints. They'll do it if it's defined.
- STANDBY (low energy + high motivation): T2–T3, lower physical demand. Desk work, planning, focused study.
- CRASH (low energy + low motivation): T1–T2 only. 5–15 min max. Easy wins. Do not suggest hard physical work.
- Consecutive skips (3+): one micro-task under 5 minutes. Getting anything logged is the only goal.

## Other rules

- Do NOT copy quests from the library verbatim. The library shows their activity patterns — generate fresh tasks.
- If streak is at risk (0–1 days), include at least one trivially completable quest.
- Avoid repeating anything flagged in DIMINISHING RETURNS. Find a variation or different angle.
- When the spec has multiple focus areas, spread the suggestions across them — don't stack all quests on one area.

## Output format

Respond with ONLY a JSON array. No markdown, no wrapper object.

Each element:
- name: string — specific and actionable. Include a scope, metric, or deliverable where it helps ("one phase", "20 min", "5×5", "to green tests")
- stat: STR | END | DEX | INT | WIS | CHA
- difficulty_tier: 1–5
- base_xp: integer within tier range (T1: 10–25, T2: 25–75, T3: 75–150, T4: 150–300, T5: 300–500)
- logging_mode: "detailed" for tracked physical training (sets/reps/weight), "quick" for everything else
- reasoning: 2–3 sentences — what this moves forward, why now given their state, what it actually requires of them today`;

export interface DiagnosticSuggestion {
  name: string;
  stat: string;
  difficulty_tier: number;
  base_xp: number;
  logging_mode?: "quick" | "detailed";
  reasoning: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await request.json();
  const userMessage = buildUserMessage(payload);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText =
    response.content.find((b): b is Anthropic.TextBlock => b.type === "text")
      ?.text ?? "[]";

  // Strip markdown code fences if Claude wraps the JSON
  const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let suggestions: DiagnosticSuggestion[];
  try {
    suggestions = JSON.parse(text);
    if (!Array.isArray(suggestions)) throw new Error("Not an array");
  } catch (parseErr) {
    console.error("Diagnose parse error:", parseErr, "raw:", rawText);
    return Response.json(
      { error: "Failed to parse diagnostic response", raw: rawText },
      { status: 500 }
    );
  }

  // Deactivate previous AI missions, then insert new ones
  await supabase
    .from("quests")
    .update({ is_active: false })
    .eq("profile_id", user.id)
    .contains("tags", ["ai"]);

  const questInserts = suggestions.map((s) => ({
    profile_id: user.id,
    name: s.name,
    stat: s.stat,
    difficulty_tier: String(s.difficulty_tier),
    base_xp: s.base_xp,
    quest_type: "repeatable",
    logging_mode: s.logging_mode ?? "quick",
    is_active: true,
    deadline: null,
    notes: s.reasoning,
    tags: ["ai"],
    chain_id: null,
    chain_order: null,
  }));

  await supabase.from("quests").insert(questInserts);

  return Response.json({ suggestions });
}

function buildUserMessage(payload: Record<string, unknown>): string {
  const stats = (payload.stats as Array<{ stat_name: string; level: number; current_xp: number; total_xp: number }>) ?? [];
  const quests = (payload.quests as Array<{ name: string; stat: string; difficulty_tier: string; base_xp: number; logging_mode: string; tags: string[] }>) ?? [];
  const recentCompletions = (payload.recentCompletions as Array<{ quest_name: string; stat: string; completed_at: string; xp_earned: number }>) ?? [];
  const streak = (payload.streak as { days: number; multiplier: number }) ?? { days: 0, multiplier: 1 };
  const mood = (payload.mood as Array<{ energy: string | null; motivation: string | null; was_skipped: boolean; logged_at: string }>) ?? [];
  const diminishingReturns = (payload.diminishingReturns as Array<{ quest_name: string; completions_last_14: number }>) ?? [];
  const unlockedNodes = (payload.unlockedNodes as string[]) ?? [];
  const streakHistory = (payload.streakHistory as Array<{ max_days: number; death_tax_applied: number; streak_end: string | null }>) ?? [];
  const activeSpec = (payload.activeSpec as { spec_name: string; focus_areas: string[]; primary_stats: string[]; days_active: number; respec_token_available: boolean } | null) ?? null;
  const timeContext = (payload.timeContext as { hour: number; dayOfWeek: string }) ?? { hour: 0, dayOfWeek: "Unknown" };

  const lines: string[] = [];

  // Spec goes first — it's the primary lens for quest generation
  lines.push("=== PLAYER GOALS (ACTIVE SPEC) ===");
  if (!activeSpec) {
    lines.push("No spec active — use stat imbalances and quest library as context.");
  } else {
    lines.push(`Spec: ${activeSpec.spec_name}`);
    lines.push(`Focus areas: ${activeSpec.focus_areas.join(", ")}`);
    lines.push(`Primary stats: ${activeSpec.primary_stats.join(", ")}`);
    lines.push(`Active for: ${activeSpec.days_active} days`);
  }
  lines.push("");

  lines.push("=== CURRENT STATE ===");
  lines.push(`Time: ${timeContext.dayOfWeek}, hour ${timeContext.hour}`);
  lines.push(`Streak: ${streak.days} days | Multiplier: ${streak.multiplier}×`);
  lines.push("");

  lines.push("=== MOOD (most recent first) ===");
  if (mood.length === 0) {
    lines.push("No mood data.");
  } else {
    for (const m of mood) {
      if (m.was_skipped) {
        lines.push(`${new Date(m.logged_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}: SKIPPED`);
      } else {
        lines.push(`${new Date(m.logged_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}: Energy=${m.energy?.toUpperCase()} Motivation=${m.motivation?.toUpperCase()}`);
      }
    }
  }
  lines.push("");

  lines.push("=== STAT LEVELS ===");
  for (const s of stats) {
    lines.push(`${s.stat_name}: Lv${s.level} (${s.current_xp}/${Math.floor(100 * Math.pow(s.level + 1, 1.5))} XP)`);
  }
  lines.push("");

  lines.push("=== ACTIVE SKILL NODES ===");
  if (unlockedNodes.length === 0) {
    lines.push("None unlocked yet.");
  } else {
    lines.push(unlockedNodes.join(", "));
  }
  lines.push("");

  lines.push("=== RECENT ACTIVITY (last 14 days) ===");
  if (recentCompletions.length === 0) {
    lines.push("No recent completions.");
  } else {
    for (const log of recentCompletions.slice(0, 20)) {
      const date = new Date(log.completed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
      lines.push(`${date} — ${log.quest_name} [${log.stat}] +${log.xp_earned} XP`);
    }
  }
  lines.push("");

  lines.push("=== DIMINISHING RETURNS FLAGS ===");
  if (diminishingReturns.length === 0) {
    lines.push("None flagged.");
  } else {
    for (const dr of diminishingReturns) {
      lines.push(`${dr.quest_name}: completed ${dr.completions_last_14}× in last 14 days`);
    }
  }
  lines.push("");

  lines.push("=== STREAK / DEATH TAX HISTORY (last 3) ===");
  if (streakHistory.length === 0) {
    lines.push("No streak breaks recorded.");
  } else {
    for (const h of streakHistory) {
      const endDate = h.streak_end
        ? new Date(h.streak_end).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
        : "ongoing";
      lines.push(`${h.max_days}d streak ended ${endDate} — death tax: ${h.death_tax_applied} XP`);
    }
  }
  lines.push("");

  lines.push("=== QUEST LIBRARY (context only — do not copy verbatim) ===");
  for (const q of quests) {
    const tags = q.tags.filter((t) => t !== "ai").join(", ");
    lines.push(`${q.name} — ${q.stat} T${q.difficulty_tier} ${q.base_xp}XP (${q.logging_mode})${tags ? ` [${tags}]` : ""}`);
  }

  return lines.join("\n");
}
