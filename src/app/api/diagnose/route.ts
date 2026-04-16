import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a quest master for a life RPG called Overclock. Your player has provided their current state. Your job is to generate 3–5 quests that:

1. Address stat imbalances (suggest activities for lagging stats)
2. Push progression (don't suggest things they've been grinding at the same intensity — check diminishing returns flags)
3. Match current energy/motivation (don't suggest epic quests when they're dragging; don't suggest trivial quests when they're fired up)
4. Protect or rebuild streaks (if streak is at risk, suggest achievable quests to maintain it)
5. Advance active skill tree branches where possible
6. Consider quest chains if the player needs direction

Tone: Direct and practical. No motivational fluff. No cheerleading. The player prefers realism. If they're in a hole, acknowledge it plainly and give them a concrete ladder out.

If mood data shows consecutive skips, treat this as disengagement. Suggest the lowest-friction possible quests — things that take under 5 minutes. The goal is to get them logging anything, not to push hard.

Respond with ONLY a JSON array — no markdown, no explanation, no wrapper object. Each element has these exact fields:
- name: string (quest name)
- stat: one of STR, END, DEX, INT, WIS, CHA
- difficulty_tier: integer 1–5
- base_xp: integer within the tier range (T1: 10–25, T2: 25–75, T3: 75–150, T4: 150–300, T5: 300–500)
- reasoning: string (one sentence explaining why this quest right now)

Example format:
[
  {"name": "...", "stat": "STR", "difficulty_tier": 3, "base_xp": 100, "reasoning": "..."},
  ...
]`;

export interface DiagnosticSuggestion {
  name: string;
  stat: string;
  difficulty_tier: number;
  base_xp: number;
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
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    response.content.find((b): b is Anthropic.TextBlock => b.type === "text")
      ?.text ?? "[]";

  let suggestions: DiagnosticSuggestion[];
  try {
    suggestions = JSON.parse(text);
    if (!Array.isArray(suggestions)) throw new Error("Not an array");
  } catch {
    return Response.json(
      { error: "Failed to parse diagnostic response", raw: text },
      { status: 500 }
    );
  }

  return Response.json({ suggestions });
}

function buildUserMessage(payload: {
  stats: Array<{ stat_name: string; level: number; current_xp: number; total_xp: number }>;
  quests: Array<{ name: string; stat: string; difficulty_tier: string; base_xp: number; logging_mode: string; tags: string[] }>;
  recentCompletions: Array<{ quest_name: string; stat: string; completed_at: string; xp_earned: number }>;
  streak: { days: number; multiplier: number };
  mood: Array<{ energy: string | null; motivation: string | null; was_skipped: boolean; logged_at: string }>;
  diminishingReturns: Array<{ quest_name: string; completions_last_14: number }>;
  timeContext: { hour: number; dayOfWeek: string };
}): string {
  const lines: string[] = [];

  lines.push("=== SYSTEM STATE ===");
  lines.push(`Time: ${payload.timeContext.dayOfWeek}, hour ${payload.timeContext.hour}`);
  lines.push(`Streak: ${payload.streak.days} days | Multiplier: ${payload.streak.multiplier}×`);
  lines.push("");

  lines.push("=== STAT LEVELS ===");
  for (const s of payload.stats) {
    lines.push(`${s.stat_name}: Lv${s.level} (${s.current_xp}/${Math.floor(100 * Math.pow(s.level + 1, 1.5))} XP)`);
  }
  lines.push("");

  lines.push("=== RECENT ACTIVITY (last 14 days) ===");
  if (payload.recentCompletions.length === 0) {
    lines.push("No recent completions.");
  } else {
    for (const log of payload.recentCompletions.slice(0, 20)) {
      const date = new Date(log.completed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
      lines.push(`${date} — ${log.quest_name} [${log.stat}] +${log.xp_earned} XP`);
    }
  }
  lines.push("");

  lines.push("=== DIMINISHING RETURNS FLAGS ===");
  if (payload.diminishingReturns.length === 0) {
    lines.push("None flagged.");
  } else {
    for (const dr of payload.diminishingReturns) {
      lines.push(`${dr.quest_name}: completed ${dr.completions_last_14}× in last 14 days`);
    }
  }
  lines.push("");

  lines.push("=== MOOD (last 5 entries) ===");
  if (payload.mood.length === 0) {
    lines.push("No mood data.");
  } else {
    for (const m of payload.mood) {
      if (m.was_skipped) {
        lines.push(`${new Date(m.logged_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}: SKIPPED`);
      } else {
        lines.push(`${new Date(m.logged_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}: Energy=${m.energy?.toUpperCase()} Motivation=${m.motivation?.toUpperCase()}`);
      }
    }
  }
  lines.push("");

  lines.push("=== QUEST LIBRARY ===");
  for (const q of payload.quests) {
    const tags = q.tags.length > 0 ? ` [${q.tags.join(", ")}]` : "";
    lines.push(`${q.name} — ${q.stat} T${q.difficulty_tier} ${q.base_xp}XP (${q.logging_mode})${tags}`);
  }

  return lines.join("\n");
}
