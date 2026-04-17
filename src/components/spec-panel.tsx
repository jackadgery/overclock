"use client";

import { useState, useEffect, useRef } from "react";
import { getActiveSpec, getStats, activateSpec, checkAndAwardRespecToken } from "@/lib/db";
import { STAT_INFO, type Spec, type Stat, type StatName, type SpecOption } from "@/lib/types";

type PanelMode = "idle" | "input" | "picking";

export function SpecPanel() {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<PanelMode>("idle");
  const [goals, setGoals] = useState("");
  const [options, setOptions] = useState<SpecOption[]>([]);
  const [generating, setGenerating] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [s, activeSpec] = await Promise.all([getStats(), getActiveSpec()]);
        setStats(s);
        if (activeSpec) {
          // Check if token should be awarded (30-day commitment)
          await checkAndAwardRespecToken();
          // Re-fetch to get updated token status
          const refreshed = await getActiveSpec();
          setSpec(refreshed);
        } else {
          setSpec(null);
        }
      } catch (err) {
        console.error("Failed to load spec:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (mode === "input") {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [mode]);

  async function handleGenerate() {
    if (!goals.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: goals.trim(),
          stats: stats.map((s) => ({ stat_name: s.stat_name, level: s.level })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOptions(data.options);
      setMode("picking");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleActivate(option: SpecOption) {
    if (activating) return;
    setActivating(option.spec_name);
    try {
      const newSpec = await activateSpec({
        spec_name: option.spec_name,
        focus_areas: option.focus_areas,
        primary_stats: option.primary_stats as StatName[],
      });
      setSpec(newSpec);
      setMode("idle");
      setGoals("");
      setOptions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setActivating(null);
    }
  }

  function openGenerator() {
    setError(null);
    setGoals("");
    setOptions([]);
    setMode("input");
  }

  function closeOverlay() {
    setMode("idle");
    setError(null);
  }

  const daysSinceActivation = spec
    ? Math.floor((Date.now() - new Date(spec.activated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const daysUntilToken = Math.max(0, 30 - daysSinceActivation);

  // ── Overlay ──────────────────────────────────────────────────────────────

  const showOverlay = mode === "input" || mode === "picking";

  return (
    <>
      {/* Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm">
            <div className="font-mono mb-4">
              <div className="text-[10px] text-oc-cyan/40 uppercase tracking-widest mb-0.5">
                SYS.SPEC // FOCUS CALIBRATION
              </div>
              <div className="text-[11px] text-neutral-500">
                {mode === "input"
                  ? "what do you want to work on this season?"
                  : "select your focus path"}
              </div>
            </div>

            {mode === "input" && (
              <>
                <textarea
                  ref={textareaRef}
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="e.g. buhurt strength and conditioning, building apps, cardio, cooking..."
                  rows={4}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 font-mono text-xs text-neutral-200 placeholder-neutral-700 resize-none focus:outline-none focus:border-oc-cyan/50 mb-3"
                />
                {error && (
                  <div className="text-[10px] font-mono text-oc-magenta mb-3">
                    SYS.ERR: {error}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={!goals.trim() || generating}
                    className="flex-1 py-2.5 font-mono text-[10px] uppercase tracking-wider border border-oc-cyan/50 bg-oc-cyan/5 text-oc-cyan rounded hover:bg-oc-cyan/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {generating ? "generating..." : "generate options →"}
                  </button>
                  <button
                    onClick={closeOverlay}
                    disabled={generating}
                    className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider border border-neutral-800 text-neutral-600 rounded hover:text-neutral-400 transition-colors disabled:opacity-40"
                  >
                    cancel
                  </button>
                </div>
              </>
            )}

            {mode === "picking" && (
              <>
                <div className="space-y-3 mb-3">
                  {options.map((opt) => (
                    <SpecOptionCard
                      key={opt.spec_name}
                      option={opt}
                      activating={activating}
                      onSelect={handleActivate}
                    />
                  ))}
                </div>
                {error && (
                  <div className="text-[10px] font-mono text-oc-magenta mb-3">
                    SYS.ERR: {error}
                  </div>
                )}
                <button
                  onClick={() => setMode("input")}
                  disabled={!!activating}
                  className="w-full text-center text-[9px] font-mono text-neutral-700 hover:text-neutral-500 transition-colors py-1 uppercase tracking-widest disabled:cursor-not-allowed"
                >
                  ← regenerate
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Panel */}
      {loading ? (
        <div className="border border-neutral-800 rounded-lg p-4 mb-5">
          <div className="text-[10px] font-mono text-neutral-700 animate-pulse">
            Loading spec...
          </div>
        </div>
      ) : spec ? (
        <ActiveSpecCard
          spec={spec}
          daysActive={daysSinceActivation}
          daysUntilToken={daysUntilToken}
          onRespec={openGenerator}
        />
      ) : (
        <NoSpecCard onInitialise={openGenerator} />
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NoSpecCard({ onInitialise }: { onInitialise: () => void }) {
  return (
    <div className="border border-neutral-800 rounded-lg p-4 mb-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest mb-0.5">
            SYS.SPEC
          </div>
          <div className="text-xs font-mono text-neutral-500">No focus path active</div>
        </div>
        <button
          onClick={onInitialise}
          className="text-[10px] font-mono text-oc-cyan border border-oc-cyan/40 bg-oc-cyan/5 px-3 py-1.5 rounded hover:bg-oc-cyan/10 transition-colors uppercase tracking-wider"
        >
          Initialise →
        </button>
      </div>
    </div>
  );
}

function ActiveSpecCard({
  spec,
  daysActive,
  daysUntilToken,
  onRespec,
}: {
  spec: Spec;
  daysActive: number;
  daysUntilToken: number;
  onRespec: () => void;
}) {
  return (
    <div className="border border-oc-cyan/20 rounded-lg p-4 mb-5 bg-oc-cyan/[0.03]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] font-mono text-oc-cyan/50 uppercase tracking-widest mb-0.5">
            SYS.SPEC // ACTIVE
          </div>
          <div className="font-mono text-sm font-bold text-oc-cyan tracking-wider uppercase">
            {spec.spec_name}
          </div>
        </div>
        <div className="flex gap-1 flex-wrap justify-end">
          {(spec.primary_stats as StatName[]).map((s) => (
            <span
              key={s}
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                color: STAT_INFO[s].colour,
                backgroundColor: `${STAT_INFO[s].colour}18`,
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {(spec.focus_areas as string[]).map((area) => (
          <span
            key={area}
            className="text-[9px] font-mono text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded"
          >
            {area}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-neutral-600">
          {daysActive}d active ·{" "}
          <span className="text-oc-amber">+1.15× on {(spec.primary_stats as string[]).join("/")}</span>
        </span>

        {spec.respec_token_available ? (
          <button
            onClick={onRespec}
            className="text-oc-amber border border-oc-amber/40 bg-oc-amber/5 px-2.5 py-1 rounded hover:bg-oc-amber/10 transition-colors uppercase tracking-wider text-[9px]"
          >
            Respec ◈
          </button>
        ) : (
          <span className="text-neutral-700 uppercase tracking-wider">
            {daysUntilToken}d to token
          </span>
        )}
      </div>
    </div>
  );
}

function SpecOptionCard({
  option,
  activating,
  onSelect,
}: {
  option: SpecOption;
  activating: string | null;
  onSelect: (option: SpecOption) => void;
}) {
  const isActivating = activating === option.spec_name;
  const isDisabled = !!activating;

  return (
    <div
      className={`border rounded-lg p-3 transition-colors ${
        isActivating
          ? "border-oc-cyan/50 bg-oc-cyan/5"
          : "border-neutral-800 bg-neutral-900/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-mono text-xs font-bold text-neutral-200 uppercase tracking-wider">
            {option.spec_name}
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
            {option.description}
          </div>
        </div>
        <button
          onClick={() => onSelect(option)}
          disabled={isDisabled}
          className="shrink-0 text-[10px] font-mono text-oc-cyan border border-oc-cyan/40 bg-oc-cyan/5 px-2.5 py-1 rounded hover:bg-oc-cyan/10 transition-colors uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isActivating ? "..." : "Select"}
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(option.primary_stats as StatName[]).map((s) => (
          <span
            key={s}
            className="text-[9px] font-mono font-bold"
            style={{ color: STAT_INFO[s].colour }}
          >
            {s}
          </span>
        ))}
        <span className="text-neutral-800">·</span>
        {option.focus_areas.map((area) => (
          <span key={area} className="text-[9px] font-mono text-neutral-600">
            {area}
          </span>
        ))}
      </div>
    </div>
  );
}
