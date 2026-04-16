"use client";

import { useState } from "react";
import { createMoodLog } from "@/lib/db";
import type { EnergyLevel, MotivationLevel } from "@/lib/types";

interface Quadrant {
  label: string;
  sublabel: string;
  energy: EnergyLevel;
  motivation: MotivationLevel;
  colour: string;
  borderColour: string;
}

const QUADRANTS: Quadrant[][] = [
  // Row 1: High Energy
  [
    {
      label: "Restless",
      sublabel: "High energy · Low motivation",
      energy: "high",
      motivation: "low",
      colour: "text-oc-cyan",
      borderColour: "border-oc-cyan/30 hover:border-oc-cyan/70 hover:bg-oc-cyan/5",
    },
    {
      label: "Let's Go",
      sublabel: "High energy · High motivation",
      energy: "high",
      motivation: "high",
      colour: "text-oc-green",
      borderColour: "border-oc-green/30 hover:border-oc-green/70 hover:bg-oc-green/5",
    },
  ],
  // Row 2: Low Energy
  [
    {
      label: "Dragging",
      sublabel: "Low energy · Low motivation",
      energy: "low",
      motivation: "low",
      colour: "text-oc-magenta",
      borderColour: "border-oc-magenta/30 hover:border-oc-magenta/70 hover:bg-oc-magenta/5",
    },
    {
      label: "Willing But Tired",
      sublabel: "Low energy · High motivation",
      energy: "low",
      motivation: "high",
      colour: "text-oc-amber",
      borderColour: "border-oc-amber/30 hover:border-oc-amber/70 hover:bg-oc-amber/5",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="font-mono mb-4 text-center">
          <div className="text-[10px] text-oc-cyan/50 mb-1 uppercase tracking-wider">
            SYS.STATUS // Quick Diagnostic
          </div>
          <div className="text-sm text-neutral-300">
            Current system state?
          </div>
        </div>

        {/* 2×2 Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {QUADRANTS.flat().map((q) => (
            <button
              key={q.label}
              onClick={() => handleSelect(q.energy, q.motivation)}
              disabled={submitting}
              className={`border rounded-lg p-4 text-left transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-neutral-900/80 ${q.borderColour}`}
            >
              <div className={`text-sm font-mono font-bold mb-0.5 ${q.colour}`}>
                {q.label}
              </div>
              <div className="text-[10px] font-mono text-neutral-600 leading-tight">
                {q.sublabel}
              </div>
            </button>
          ))}
        </div>

        {/* Skip */}
        <button
          onClick={handleSkip}
          disabled={submitting}
          className="w-full text-center text-[10px] font-mono text-neutral-600 hover:text-neutral-400 transition-colors py-1 disabled:cursor-not-allowed"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
