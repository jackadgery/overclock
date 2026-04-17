"use client";

import { useState, useRef } from "react";
import { createMoodLog } from "@/lib/db";
import type { EnergyLevel, MotivationLevel } from "@/lib/types";

const QUADRANTS = [
  {
    energy: "high" as EnergyLevel,
    motivation: "low" as MotivationLevel,
    code: "SURGE",
    sublabel: "energy spike · no direction",
    color: "#00f0ff",
    corner: { top: "8px", left: "8px" } as React.CSSProperties,
  },
  {
    energy: "high" as EnergyLevel,
    motivation: "high" as MotivationLevel,
    code: "APEX",
    sublabel: "primed for output",
    color: "#00ff88",
    corner: { top: "8px", right: "8px" } as React.CSSProperties,
  },
  {
    energy: "low" as EnergyLevel,
    motivation: "low" as MotivationLevel,
    code: "CRASH",
    sublabel: "system depleted",
    color: "#ff2d6b",
    corner: { bottom: "8px", left: "8px" } as React.CSSProperties,
  },
  {
    energy: "low" as EnergyLevel,
    motivation: "high" as MotivationLevel,
    code: "STANDBY",
    sublabel: "will online · power low",
    color: "#ffb800",
    corner: { bottom: "8px", right: "8px" } as React.CSSProperties,
  },
];

interface MoodGridProps {
  onDone: () => void;
}

export function MoodGrid({ onDone }: MoodGridProps) {
  const [submitting, setSubmitting] = useState(false);
  const [dot, setDot] = useState<{ x: number; y: number } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  function getCoords(e: React.MouseEvent<HTMLDivElement>): { x: number; y: number } | null {
    const el = areaRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.01, Math.min(0.99, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }

  async function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (submitting) return;
    const coords = getCoords(e);
    if (!coords) return;

    // x = motivation axis (0=left=low → 1=right=high)
    // y = energy axis inverted (y=0=top=high energy)
    const motivationValue = coords.x;
    const energyValue = 1 - coords.y;

    const energy: EnergyLevel = energyValue >= 0.5 ? "high" : "low";
    const motivation: MotivationLevel = motivationValue >= 0.5 ? "high" : "low";

    setDot(coords);
    setSubmitting(true);

    try {
      await createMoodLog({
        logged_at: new Date().toISOString(),
        energy,
        motivation,
        energy_value: parseFloat(energyValue.toFixed(3)),
        motivation_value: parseFloat(motivationValue.toFixed(3)),
        was_skipped: false,
      });
    } catch (err) {
      console.error("Failed to log mood:", err);
    } finally {
      setTimeout(onDone, 380);
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

  const activeQuadrant = dot
    ? QUADRANTS.find(
        (q) =>
          q.energy === (1 - dot.y >= 0.5 ? "high" : "low") &&
          q.motivation === (dot.x >= 0.5 ? "high" : "low")
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-5">
      <div className="w-full max-w-xs">
        {/* Header */}
        <div className="font-mono mb-3">
          <div className="text-[10px] text-oc-cyan/40 uppercase tracking-widest mb-0.5">
            SYS.INPUT // BIOMETRIC
          </div>
          <div className="text-[11px] min-h-[16px]">
            {activeQuadrant ? (
              <span style={{ color: activeQuadrant.color }}>
                {activeQuadrant.code} — {activeQuadrant.sublabel}
              </span>
            ) : (
              <span className="text-neutral-500">plot current state vector</span>
            )}
          </div>
        </div>

        {/* Motivation axis top labels */}
        <div className="flex justify-between mb-1 pl-6 pr-0.5">
          <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-wider">
            M.LOW
          </span>
          <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-wider">
            M.HIGH
          </span>
        </div>

        <div className="flex items-stretch gap-2">
          {/* Energy axis side labels */}
          <div className="flex flex-col justify-between py-1.5 w-5 shrink-0">
            <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-wider leading-none">
              E.HI
            </span>
            <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-wider leading-none">
              E.LO
            </span>
          </div>

          {/* Clickable graph */}
          <div
            ref={areaRef}
            onClick={handleClick}
            className="relative flex-1 aspect-square rounded border border-neutral-800 overflow-hidden select-none"
            style={{
              cursor: submitting ? "default" : "crosshair",
              background: "#07070a",
            }}
          >
            {/* Quadrant labels */}
            {QUADRANTS.map((q) => (
              <div
                key={q.code}
                className="absolute font-mono text-[9px] font-bold uppercase tracking-wider pointer-events-none transition-opacity duration-150"
                style={{
                  ...q.corner,
                  color: q.color,
                  opacity: dot
                    ? activeQuadrant?.code === q.code
                      ? 1
                      : 0.1
                    : 0.28,
                }}
              >
                {q.code}
              </div>
            ))}

            {/* SVG: axes + dot */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Center axes */}
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#1c1c22" strokeWidth="1" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#1c1c22" strokeWidth="1" />

              {dot && (
                <>
                  {/* Crosshair from dot to edges */}
                  <line
                    x1={`${dot.x * 100}%`} y1="0"
                    x2={`${dot.x * 100}%`} y2="100%"
                    stroke={activeQuadrant?.color ?? "#888"}
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                  <line
                    x1="0" y1={`${dot.y * 100}%`}
                    x2="100%" y2={`${dot.y * 100}%`}
                    stroke={activeQuadrant?.color ?? "#888"}
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                  {/* Outer ring */}
                  <circle
                    cx={`${dot.x * 100}%`}
                    cy={`${dot.y * 100}%`}
                    r="10"
                    fill="none"
                    stroke={activeQuadrant?.color ?? "#888"}
                    strokeWidth="1"
                    opacity="0.45"
                  />
                  {/* Core dot */}
                  <circle
                    cx={`${dot.x * 100}%`}
                    cy={`${dot.y * 100}%`}
                    r="3.5"
                    fill={activeQuadrant?.color ?? "#888"}
                    opacity="0.95"
                  />
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Skip */}
        <button
          onClick={handleSkip}
          disabled={submitting}
          className="w-full text-center text-[9px] font-mono text-neutral-700 hover:text-neutral-500 transition-colors mt-3 py-1.5 uppercase tracking-widest disabled:cursor-not-allowed"
        >
          bypass.log
        </button>
      </div>
    </div>
  );
}
