"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getQuest, getProfile, getStats, getQuestLogsForQuest } from "@/lib/db";
import { completeQuest } from "@/lib/quest-actions";
import { calculateTonnage } from "@/lib/xp";
import { StatBadge } from "@/components/stat-badge";
import { TIER_XP_RANGES, type Quest, type Profile, type Stat } from "@/lib/types";

interface ExerciseEntry {
  name: string;
  sets: { reps: string; weight: string }[];
}

export default function DetailedLogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questId = searchParams.get("quest");

  const [quest, setQuest] = useState<Quest | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ xp: number } | null>(null);

  const [exercises, setExercises] = useState<ExerciseEntry[]>([
    { name: "", sets: [{ reps: "", weight: "" }] },
  ]);
  const [durationMinutes, setDurationMinutes] = useState("");

  useEffect(() => {
    async function load() {
      if (!questId) return;
      try {
        const [q, p, s] = await Promise.all([
          getQuest(questId),
          getProfile(),
          getStats(),
        ]);
        setQuest(q);
        setProfile(p);
        setStats(s);
      } catch (err) {
        console.error("Failed to load:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [questId]);

  // ---- Exercise management ----

  function addExercise() {
    setExercises([...exercises, { name: "", sets: [{ reps: "", weight: "" }] }]);
  }

  function removeExercise(index: number) {
    if (exercises.length <= 1) return;
    setExercises(exercises.filter((_, i) => i !== index));
  }

  function updateExerciseName(index: number, name: string) {
    const updated = [...exercises];
    updated[index].name = name;
    setExercises(updated);
  }

  function addSet(exerciseIndex: number) {
    const updated = [...exercises];
    // Pre-fill with previous set's values for convenience
    const lastSet = updated[exerciseIndex].sets.at(-1);
    updated[exerciseIndex].sets.push({
      reps: lastSet?.reps ?? "",
      weight: lastSet?.weight ?? "",
    });
    setExercises(updated);
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    const updated = [...exercises];
    if (updated[exerciseIndex].sets.length <= 1) return;
    updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter(
      (_, i) => i !== setIndex
    );
    setExercises(updated);
  }

  function updateSet(
    exerciseIndex: number,
    setIndex: number,
    field: "reps" | "weight",
    value: string
  ) {
    const updated = [...exercises];
    updated[exerciseIndex].sets[setIndex][field] = value;
    setExercises(updated);
  }

  // ---- Tonnage calculation ----

  function getTotalTonnage(): number {
    let total = 0;
    for (const ex of exercises) {
      for (const set of ex.sets) {
        const reps = parseFloat(set.reps) || 0;
        const weight = parseFloat(set.weight) || 0;
        total += reps * weight;
      }
    }
    return Math.round(total);
  }

  function getExerciseTonnage(ex: ExerciseEntry): number {
    return ex.sets.reduce((sum, set) => {
      const reps = parseFloat(set.reps) || 0;
      const weight = parseFloat(set.weight) || 0;
      return sum + reps * weight;
    }, 0);
  }

  // ---- Submit ----

  async function handleSubmit() {
    if (!quest || !profile || submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      // Validate at least one exercise with data
      const validExercises = exercises.filter(
        (ex) =>
          ex.name.trim() &&
          ex.sets.some((s) => parseFloat(s.reps) > 0 && parseFloat(s.weight) > 0)
      );

      if (validExercises.length === 0) {
        throw new Error("Log at least one exercise with reps and weight.");
      }

      const totalTonnage = getTotalTonnage();

      // Build volume data
      const volumeData = {
        exercises: validExercises.map((ex) => ({
          name: ex.name.trim(),
          sets: ex.sets
            .filter((s) => parseFloat(s.reps) > 0 && parseFloat(s.weight) > 0)
            .map((s) => ({
              reps: parseFloat(s.reps),
              weight: parseFloat(s.weight),
            })),
        })),
        total_tonnage: totalTonnage,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : undefined,
      };

      // Get recent logs for diminishing returns
      const recentLogs = await getQuestLogsForQuest(quest.id, 14);
      const sameIntensityCount = recentLogs.length;

      const stat = stats.find((s) => s.stat_name === quest.stat);
      const baselineTonnage = stat?.baseline_tonnage ?? null;

      const result = await completeQuest({
        quest,
        profile,
        stats,
        sameIntensityCount,
        actualTonnage: totalTonnage,
        baselineTonnage: baselineTonnage ?? undefined,
        volumeData,
      });

      setSuccess({ xp: result.xpEarned });

      // If no baseline was set, set it from this session
      if (!baselineTonnage && totalTonnage > 0 && stat) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase
          .from("stats")
          .update({ baseline_tonnage: totalTonnage })
          .eq("id", stat.id);
      }

      // Redirect after brief delay
      setTimeout(() => {
        router.push("/quests");
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Render ----

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs text-neutral-500">
          Loading mission parameters...
        </div>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs text-oc-magenta">
          SYS.ERR: Mission not found
        </div>
      </div>
    );
  }

  const totalTonnage = getTotalTonnage();

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-5 font-mono">
          <div className="text-xs text-oc-cyan/50 mb-1">
            SYS.MISSIONS // DETAILED LOG
          </div>
          <div className="flex items-center gap-2 mb-1">
            <StatBadge stat={quest.stat} size="md" />
            <span className="text-[10px] text-neutral-500 uppercase">
              T{quest.difficulty_tier} · {TIER_XP_RANGES[quest.difficulty_tier].label}
            </span>
          </div>
          <h1 className="text-lg font-bold text-neutral-100 tracking-wide">
            {quest.name}
          </h1>
        </div>

        {/* Success banner */}
        {success && (
          <div className="mb-4 p-3 rounded-lg border border-oc-green/30 bg-oc-green/5 font-mono text-xs">
            <span className="text-oc-green">MISSION CONFIRMED</span>
            <span className="text-oc-amber ml-2">+{success.xp} XP</span>
            <div className="text-neutral-500 mt-1">
              Tonnage: {totalTonnage.toLocaleString()} kg
            </div>
          </div>
        )}

        {/* Exercises */}
        <div className="space-y-4 mb-5">
          {exercises.map((ex, exIdx) => (
            <div
              key={exIdx}
              className="border border-oc-border rounded-lg p-3 bg-oc-surface/50"
            >
              {/* Exercise name */}
              <div className="flex items-center justify-between mb-2">
                <input
                  type="text"
                  value={ex.name}
                  onChange={(e) => updateExerciseName(exIdx, e.target.value)}
                  placeholder="Exercise name"
                  className="flex-1 bg-transparent text-sm font-mono text-neutral-200 placeholder:text-neutral-600 focus:outline-none border-b border-neutral-700 focus:border-oc-cyan pb-1 transition-colors"
                />
                {exercises.length > 1 && (
                  <button
                    onClick={() => removeExercise(exIdx)}
                    className="text-neutral-600 hover:text-oc-magenta ml-2 text-xs font-mono transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Sets header */}
              <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 mb-1">
                <div className="text-[9px] font-mono text-neutral-600 uppercase text-center">
                  Set
                </div>
                <div className="text-[9px] font-mono text-neutral-600 uppercase">
                  Reps
                </div>
                <div className="text-[9px] font-mono text-neutral-600 uppercase">
                  kg
                </div>
                <div />
              </div>

              {/* Sets */}
              {ex.sets.map((set, setIdx) => (
                <div
                  key={setIdx}
                  className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 mb-1.5"
                >
                  <div className="text-xs font-mono text-neutral-500 text-center py-1.5">
                    {setIdx + 1}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps}
                    onChange={(e) =>
                      updateSet(exIdx, setIdx, "reps", e.target.value)
                    }
                    placeholder="0"
                    className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm font-mono text-neutral-200 text-center focus:outline-none focus:border-oc-cyan transition-colors"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    value={set.weight}
                    onChange={(e) =>
                      updateSet(exIdx, setIdx, "weight", e.target.value)
                    }
                    placeholder="0"
                    className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm font-mono text-neutral-200 text-center focus:outline-none focus:border-oc-cyan transition-colors"
                  />
                  <button
                    onClick={() => removeSet(exIdx, setIdx)}
                    className={`text-xs font-mono py-1.5 transition-colors ${
                      ex.sets.length > 1
                        ? "text-neutral-600 hover:text-oc-magenta"
                        : "text-neutral-800 cursor-not-allowed"
                    }`}
                    disabled={ex.sets.length <= 1}
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Add set + exercise tonnage */}
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => addSet(exIdx)}
                  className="text-[10px] font-mono text-oc-cyan hover:text-oc-cyan/80 uppercase tracking-wider transition-colors"
                >
                  + Add Set
                </button>
                <div className="text-[10px] font-mono text-neutral-500">
                  {Math.round(getExerciseTonnage(ex)).toLocaleString()} kg
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add exercise */}
        <button
          onClick={addExercise}
          className="w-full mb-5 py-2 rounded-lg border border-dashed border-neutral-700 text-xs font-mono text-neutral-500 hover:border-oc-cyan/50 hover:text-oc-cyan transition-colors uppercase tracking-wider"
        >
          + Add Exercise
        </button>

        {/* Duration (optional) */}
        <div className="mb-5">
          <label className="block text-xs font-mono text-neutral-500 mb-1 uppercase tracking-wider">
            Duration <span className="text-neutral-600">(optional, minutes)</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="e.g. 55"
            className="w-24 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 font-mono focus:outline-none focus:border-oc-cyan focus:ring-1 focus:ring-oc-cyan/30 transition-colors"
          />
        </div>

        {/* Tonnage summary */}
        <div className="border border-oc-border rounded-lg p-3 bg-oc-surface/50 mb-5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
              Total Tonnage
            </div>
            <div className="text-lg font-mono font-bold text-oc-amber">
              {totalTonnage.toLocaleString()} kg
            </div>
          </div>
          {quest.notes && (
            <div className="text-[10px] font-mono text-neutral-600 mt-2 border-t border-oc-border pt-2">
              {quest.notes}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 text-xs font-mono text-oc-magenta bg-oc-magenta/10 border border-oc-magenta/30 rounded px-3 py-2">
            SYS.ERR: {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-transparent border border-neutral-700 text-neutral-400 font-mono text-sm py-2.5 rounded hover:border-neutral-500 transition-colors uppercase tracking-wider"
          >
            Abort
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !!success}
            className="flex-1 bg-oc-green/10 border border-oc-green/50 text-oc-green font-mono text-sm py-2.5 rounded hover:bg-oc-green/20 hover:border-oc-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {submitting ? "Logging..." : success ? "Confirmed ✓" : "Log Mission"}
          </button>
        </div>
      </div>
    </div>
  );
}
