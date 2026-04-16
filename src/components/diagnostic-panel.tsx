"use client";

import { STAT_INFO, TIER_XP_RANGES, type StatName, type DifficultyTier } from "@/lib/types";
import { StatBadge } from "@/components/stat-badge";
import type { DiagnosticSuggestion } from "@/app/api/diagnose/route";

interface DiagnosticPanelProps {
  suggestions: DiagnosticSuggestion[];
  onDone: () => void;
}

export function DiagnosticPanel({ suggestions, onDone }: DiagnosticPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-sm mx-auto p-4 pb-20">
        {/* Header */}
        <div className="font-mono mb-5 pt-2">
          <div className="text-[10px] text-oc-cyan/50 mb-1 uppercase tracking-wider">
            SYS.DIAGNOSTIC // ANALYSIS COMPLETE
          </div>
          <div className="text-sm text-neutral-300">
            {suggestions.length} mission{suggestions.length !== 1 ? "s" : ""} recommended
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-3 mb-6">
          {suggestions.map((s, i) => {
            const statName = s.stat as StatName;
            const tier = String(s.difficulty_tier) as DifficultyTier;
            const tierInfo = TIER_XP_RANGES[tier];
            const statInfo = STAT_INFO[statName];

            return (
              <div
                key={i}
                className="border border-oc-border rounded-lg p-3 bg-oc-surface/50"
                style={{ borderLeftColor: statInfo?.colour, borderLeftWidth: 2 }}
              >
                {/* Top row */}
                <div className="flex items-center gap-2 mb-2">
                  <StatBadge stat={statName} size="sm" />
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">
                    T{s.difficulty_tier} · {tierInfo?.label}
                  </span>
                  <span className="text-[10px] font-mono text-oc-amber ml-auto">
                    {s.base_xp} XP
                  </span>
                </div>

                {/* Quest name */}
                <div className="text-sm font-mono font-bold text-neutral-100 mb-2">
                  {s.name}
                </div>

                {/* Reasoning */}
                <div className="text-[11px] font-mono text-neutral-500 leading-relaxed">
                  {s.reasoning}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dismiss */}
        <button
          onClick={onDone}
          className="w-full py-2.5 rounded-lg border border-neutral-700 text-neutral-400 font-mono text-sm hover:border-neutral-500 transition-colors uppercase tracking-wider"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function DiagnosticLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="font-mono text-center">
        <div className="text-[10px] text-oc-cyan/50 mb-2 uppercase tracking-wider">
          SYS.DIAGNOSTIC // RUNNING
        </div>
        <div className="text-xs text-neutral-400 animate-pulse">
          Analysing system state...
        </div>
      </div>
    </div>
  );
}

export function DiagnosticError({ onDone }: { onDone: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm font-mono text-center">
        <div className="text-[10px] text-oc-magenta/50 mb-2 uppercase tracking-wider">
          SYS.DIAGNOSTIC // FAULT
        </div>
        <div className="text-xs text-oc-magenta mb-4">
          Diagnostic failed. Check API key configuration.
        </div>
        <button
          onClick={onDone}
          className="px-6 py-2 rounded border border-neutral-700 text-neutral-400 text-xs hover:border-neutral-500 transition-colors uppercase tracking-wider"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
