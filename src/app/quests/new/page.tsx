"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createQuest } from "@/lib/db";
import {
  STAT_INFO,
  TIER_XP_RANGES,
  type StatName,
  type DifficultyTier,
  type QuestType,
  type LoggingMode,
} from "@/lib/types";

const STATS = Object.keys(STAT_INFO) as StatName[];
const TIERS = Object.keys(TIER_XP_RANGES) as DifficultyTier[];
const QUEST_TYPES: { value: QuestType; label: string }[] = [
  { value: "repeatable", label: "Routine" },
  { value: "one_off", label: "Op" },
  { value: "timed", label: "Timed Op" },
];

export default function NewQuestPage() {
  return (
    <Suspense>
      <NewQuestForm />
    </Suspense>
  );
}

function NewQuestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("t");
  const initialType: QuestType = preselect === "op" ? "one_off" : "repeatable";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [stat, setStat] = useState<StatName>("STR");
  const [tier, setTier] = useState<DifficultyTier>("3");
  const [baseXp, setBaseXp] = useState(100);
  const [questType, setQuestType] = useState<QuestType>(initialType);
  const [loggingMode, setLoggingMode] = useState<LoggingMode>("quick");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const tierRange = TIER_XP_RANGES[tier];

  // Clamp baseXp when tier changes
  function handleTierChange(newTier: DifficultyTier) {
    setTier(newTier);
    const range = TIER_XP_RANGES[newTier];
    if (baseXp < range.min) setBaseXp(range.min);
    if (baseXp > range.max) setBaseXp(range.max);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await createQuest({
        name,
        stat,
        difficulty_tier: tier,
        base_xp: baseXp,
        quest_type: questType,
        logging_mode: loggingMode,
        is_active: true,
        deadline: questType === "timed" && deadline ? deadline : null,
        notes: notes || null,
        tags,
        chain_id: null,
        chain_order: null,
      });

      router.push("/quests");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quest");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6 font-mono">
          <div className="text-xs text-oc-cyan/50 mb-1">
            SYS.MISSIONS // {questType === "repeatable" ? "NEW ROUTINE" : "NEW OP"}
          </div>
          <h1 className="text-lg font-bold text-oc-cyan tracking-wider">
            {questType === "repeatable" ? "ADD ROUTINE" : "QUEUE OP"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-mono text-neutral-500 mb-1 uppercase tracking-wider">
              Mission Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-oc-cyan focus:ring-1 focus:ring-oc-cyan/30 transition-colors"
              placeholder="e.g. Gym Session, Kitchen Clean"
            />
          </div>

          {/* Stat */}
          <div>
            <label className="block text-xs font-mono text-neutral-500 mb-1.5 uppercase tracking-wider">
              Target Subsystem
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STATS.map((s) => {
                const info = STAT_INFO[s];
                const isSelected = stat === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStat(s)}
                    className="py-2 px-2 rounded text-xs font-mono uppercase tracking-wider transition-all border text-center"
                    style={{
                      color: isSelected ? info.colour : "#737373",
                      backgroundColor: isSelected ? `${info.colour}15` : "transparent",
                      borderColor: isSelected ? `${info.colour}50` : "#2a2a30",
                    }}
                  >
                    <div className="font-bold">{s}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{info.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Tier */}
          <div>
            <label className="block text-xs font-mono text-neutral-500 mb-1.5 uppercase tracking-wider">
              Threat Level
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {TIERS.map((t) => {
                const range = TIER_XP_RANGES[t];
                const isSelected = tier === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTierChange(t)}
                    className={`py-2 rounded text-xs font-mono uppercase tracking-wider transition-all border text-center ${
                      isSelected
                        ? "text-oc-amber bg-oc-amber/10 border-oc-amber/50"
                        : "text-neutral-500 border-neutral-700 hover:border-neutral-600"
                    }`}
                  >
                    <div className="font-bold">{t}</div>
                    <div className="text-[9px] opacity-70 mt-0.5">{range.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Base XP slider */}
          <div>
            <label className="block text-xs font-mono text-neutral-500 mb-1 uppercase tracking-wider">
              Base XP Reward:{" "}
              <span className="text-oc-amber">{baseXp}</span>
              <span className="text-neutral-600 ml-1">
                ({tierRange.min}–{tierRange.max})
              </span>
            </label>
            <input
              type="range"
              min={tierRange.min}
              max={tierRange.max}
              value={baseXp}
              onChange={(e) => setBaseXp(Number(e.target.value))}
              className="w-full accent-oc-amber"
            />
          </div>

          {/* Quest Type */}
          <div>
            <label className="block text-xs font-mono text-neutral-500 mb-1.5 uppercase tracking-wider">
              Mission Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {QUEST_TYPES.map((qt) => (
                <button
                  key={qt.value}
                  type="button"
                  onClick={() => setQuestType(qt.value)}
                  className={`py-2 rounded text-xs font-mono uppercase tracking-wider transition-all border ${
                    questType === qt.value
                      ? "text-oc-cyan bg-oc-cyan/10 border-oc-cyan/50"
                      : "text-neutral-500 border-neutral-700 hover:border-neutral-600"
                  }`}
                >
                  {qt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline (timed only) */}
          {questType === "timed" && (
            <div>
              <label className="block text-xs font-mono text-neutral-500 mb-1 uppercase tracking-wider">
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 font-mono focus:outline-none focus:border-oc-cyan focus:ring-1 focus:ring-oc-cyan/30 transition-colors"
              />
            </div>
          )}

          {/* Logging Mode */}
          <div>
            <label className="block text-xs font-mono text-neutral-500 mb-1.5 uppercase tracking-wider">
              Logging Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLoggingMode("quick")}
                className={`py-2 rounded text-xs font-mono uppercase tracking-wider transition-all border ${
                  loggingMode === "quick"
                    ? "text-oc-green bg-oc-green/10 border-oc-green/50"
                    : "text-neutral-500 border-neutral-700 hover:border-neutral-600"
                }`}
              >
                <div className="font-bold">Quick</div>
                <div className="text-[10px] opacity-70 mt-0.5 normal-case">
                  Tap to complete
                </div>
              </button>
              <button
                type="button"
                onClick={() => setLoggingMode("detailed")}
                className={`py-2 rounded text-xs font-mono uppercase tracking-wider transition-all border ${
                  loggingMode === "detailed"
                    ? "text-oc-green bg-oc-green/10 border-oc-green/50"
                    : "text-neutral-500 border-neutral-700 hover:border-neutral-600"
                }`}
              >
                <div className="font-bold">Detailed</div>
                <div className="text-[10px] opacity-70 mt-0.5 normal-case">
                  Sets / reps / weight
                </div>
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-mono text-neutral-500 mb-1 uppercase tracking-wider">
              Tags <span className="text-neutral-600">(comma separated)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-oc-cyan focus:ring-1 focus:ring-oc-cyan/30 transition-colors"
              placeholder="e.g. powerlifting, upper body"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-mono text-neutral-500 mb-1 uppercase tracking-wider">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-oc-cyan focus:ring-1 focus:ring-oc-cyan/30 transition-colors resize-none"
              placeholder="Optional context"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs font-mono text-oc-magenta bg-oc-magenta/10 border border-oc-magenta/30 rounded px-3 py-2">
              SYS.ERR: {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-transparent border border-neutral-700 text-neutral-400 font-mono text-sm py-2.5 rounded hover:border-neutral-500 transition-colors uppercase tracking-wider"
            >
              Abort
            </button>
            <button
              type="submit"
              disabled={loading || !name}
              className="flex-1 bg-oc-cyan/10 border border-oc-cyan/50 text-oc-cyan font-mono text-sm py-2.5 rounded hover:bg-oc-cyan/20 hover:border-oc-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              {loading ? "Deploying..." : questType === "repeatable" ? "Add Routine" : "Queue Op"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
