"use client";

import { useState } from "react";
import { createMoodLog } from "@/lib/db";
import type { EnergyLevel, MotivationLevel } from "@/lib/types";

interface Quadrant {
  code: string;
  sublabel: string;
  energy: EnergyLevel;
  motivation: MotivationLevel;
  colour: string;
  border: string;
}

// [row 0 = HIGH energy, row 1 = LOW energy] × [col 0 = LOW motivation, col 1 = HIGH motivation]
const QUADRANTS: Quadrant[][] = [
  [
    {
      code: "SURGE",
      sublabel: "energy spike · no direction",
      energy: "high",
      motivation: "low",
      colour: "text-oc-cyan",
      border: "border-oc-cyan/30 hover:border-oc-cyan/60 hover:bg-oc-cyan/5",
    },
    {
      code: "APEX",
      sublabel: "primed for output",
      energy: "high",
      motivation: "high",
      colour: "text-oc-green",
      border: "border-oc-green/30 hover:border-oc-green/60 hover:bg-oc-green/5",
    },
  ],
  [
    {
      code: "CRASH",
      sublabel: "system depleted",
      energy: "low",
      motivation: "low",
      colour: "text-oc-magenta",
      border: "border-oc-magenta/30 hover:border-oc-magenta/60 hover:bg-oc-magenta/5",
    },
    {
      code: "STANDBY",
      sublabel: "will online · power low",
      energy: "low",
      motivation: "high",
      colour: "text-oc-amber",
      border: "border-oc-amber/30 hover:border-oc-amber/60 hover:bg-oc-amber/5",
    },
  ],
];

interface MoodGridProps {
  onDone: () => void;
}

export function MoodGrid({ onDone }: MoodGridProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSelect(energy: EnergyLevel, motivation: MotivationLevel) {
    if (submitting) return;
    setSubmitting(true);
    try {
      await createMoodLog({
        logged_at: new Date().toISOString(),
        energy,
        motivation,
        was_skipped: false,
      });
    } catch (err) {
      console.error("Failed to log mood:", err);
    } finally {
      onDone();
    }
  }

  async function handleSkip() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await createMoodLog({
        logged_at: new Date().toISOString(),
        energy: null,
        motivation: null,
        was_skipped: true,
      });
    } catch (err) {
      console.error("Failed to log mood skip:", err);
    } finally {
      onDone();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-xs">
        {/* Header */}
        <div className="font-mono mb-3">
          <div className="text-[10px] text-oc-cyan/40 uppercase tracking-widest mb-0.5">
            SYS.INPUT // BIOMETRIC
          </div>
          <div className="text-[11px] text-neutral-500">
            current state vector?
          </div>
        </div>

        {/* Axis label row: motivation */}
        <div className="grid grid-cols-2 gap-1.5 mb-1 ml-[2.75rem]">
          <div className="text-[9px] font-mono text-neutral-700 uppercase tracking-wider text-center">
            M.LOW
          </div>
          <div className="text-[9px] font-mono text-neutral-700 uppercase tracking-wider text-center">
            M.HIGH
          </div>
        </div>

        {/* Grid with energy axis labels */}
        <div className="space-y-1.5">
          {QUADRANTS.map((row, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-1.5">
              {/* Energy axis label */}
              <div className="text-[9px] font-mono text-neutral-700 uppercase tracking-wider w-9 shrink-0 text-right">
                {rowIdx === 0 ? "E.HI" : "E.LO"}
              </div>
              {row.map((q) => (
                <button
                  key={q.code}
                  onClick={() => handleSelect(q.energy, q.motivation)}
                  disabled={submitting}
                  className={`flex-1 border rounded p-3 text-left transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-neutral-950/80 ${q.border}`}
                >
                  <div className={`text-xs font-mono font-bold tracking-wider ${q.colour}`}>
                    {q.code}
                  </div>
                  <div className="text-[9px] font-mono text-neutral-600 mt-0.5 leading-tight">
                    {q.sublabel}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Skip */}
        <button
          onClick={handleSkip}
          disabled={submitting}
          className="w-full text-center text-[9px] font-mono text-neutral-700 hover:text-neutral-500 transition-colors mt-3 py-1 uppercase tracking-widest disabled:cursor-not-allowed"
        >
          bypass.log
        </button>
      </div>
    </div>
  );
}
