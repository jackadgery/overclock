import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { StatName, SpecOption } from "@/lib/types";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a spec generator for a life RPG called Overclock. The player describes what they want to work on this season. Generate exactly 3 spec options.

Each spec bundles 2–3 of the player's stated interests into a coherent identity. Pair goals that naturally complement each other. Cover different combinations so the player has a real choice between paths.

Stats: STR (resistance training, heavy physical work), END (cardio, sustained effort), DEX (mobility, sport, skill movement), INT (learning, coding, building, creating), WIS (planning, reflection, admin, finance), CHA (social tasks, household, cooking, life maintenance)

Respond with ONLY a JSON array of exactly 3 objects:
- spec_name: string (2–3 words, punchy identity label — e.g. "Warrior-Builder", "Endurance Scholar")
- description: string (one sentence capturing this identity)
- focus_areas: string[] (2–3 of the player's stated goals, cleaned up slightly)
- primary_stats: string[] (1–3 stat abbreviations that map to this spec's activities)

No markdown. No explanation. JSON array only.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { goals, stats } = await request.json() as {
    goals: string;
    stats: Array<{ stat_name: string; level: number }>;
  };

  const statsLine = stats.map((s) => `${s.stat_name} Lv${s.level}`).join(", ");
  const userMessage = `Stats: ${statsLine}\n\nGoals: "${goals}"\n\nGenerate 3 spec options.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText =
    response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "[]";

  const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let options: SpecOption[];
  try {
    options = JSON.parse(text);
    if (!Array.isArray(options) || options.length !== 3) throw new Error("Expected array of 3");
  } catch (parseErr) {
    console.error("Generate-spec parse error:", parseErr, "raw:", rawText);
    return Response.json({ error: "Failed to parse spec options", raw: rawText }, { status: 500 });
  }

  return Response.json({ options });
}
