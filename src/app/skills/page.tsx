"use client";

import { useState, useEffect, useCallback } from "react";
import { getStats, getUnlockedNodeNames, getUnlockedSpecNames, spendSkillPoint } from "@/lib/db";
import {
  getBranchesForStat,
  CROSS_STAT_SPECS,
  BRANCH_UNLOCK_LEVEL,
  type StaticNode,
} from "@/lib/skill-tree";
import { STAT_INFO, type StatName, type Stat } from "@/lib/types";

const STAT_ORDER: StatName[] = ["STR", "END", "DEX", "INT", "WIS", "CHA"];

export default function SkillsPage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [unlockedNodes, setUnlockedNodes] = useState<Set<string>>(new Set());
  const [unlockedSpecs, setUnlockedSpecs] = useState<Set<string>>(new Set());
  const [selectedStat, setSelectedStat] = useState<StatName>("STR");
  const [loading, setLoading] = useState(true);
  const [spending, setSpending] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [s, nodes, specs] = await Promise.all([
        getStats(),
        getUnlockedNodeNames(),
        getUnlockedSpecNames(),
      ]);
      setStats(s);
      setUnlockedNodes(nodes);
      setUnlockedSpecs(specs);
    } catch (err) {
      console.error("Failed to load skill data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSpend(node: StaticNode) {
    if (spending) return;
    setSpending(node.node_name);
    setFlashMessage(null);
    try {
      await spendSkillPoint(node.stat_name, node.branch_name, node.node_name, node.cost);
      setFlashMessage(`${node.node_name} unlocked`);
      await loadData();
    } catch (err) {
      setFlashMessage(err instanceof Error ? err.message : "Failed to unlock node");
    } finally {
      setSpending(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs text-neutral-500 animate-pulse">
          Loading skill matrix...
        </div>
      </div>
    );
  }

  const currentStat = stats.find((s) => s.stat_name === selectedStat);
  const statInfo = STAT_INFO[selectedStat];
  const branches = getBranchesForStat(selectedStat);
  const branchesUnlocked = (currentStat?.level ?? 0) >= BRANCH_UNLOCK_LEVEL;

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-5 font-mono">
          <div className="text-xs text-oc-cyan/50 mb-1">SYS.NODES // SKILL MATRIX</div>
          <h1 className="text-lg font-bold text-oc-cyan tracking-wider">NODES</h1>
        </div>

        {/* Flash */}
        {flashMessage && (
          <div
            className={`mb-4 p-3 rounded border font-mono text-xs ${
              flashMessage.endsWith("unlocked")
                ? "border-oc-green/30 bg-oc-green/5"
                : "border-oc-magenta/30 bg-oc-magenta/5 text-oc-magenta"
            }`}
          >
            {flashMessage.endsWith("unlocked") ? (
              <>
                <span className="text-oc-green">NODE.ACTIVE</span>
                <span className="text-neutral-400"> — {flashMessage}</span>
              </>
            ) : (
              <>SYS.ERR: {flashMessage}</>
            )}
          </div>
        )}

        {/* Stat selector */}
        <div className="grid grid-cols-6 gap-1.5 mb-5">
          {STAT_ORDER.map((statName) => {
            const info = STAT_INFO[statName];
            const s = stats.find((st) => st.stat_name === statName);
            const pts = s?.skill_points_available ?? 0;
            const isSelected = selectedStat === statName;
            return (
              <button
                key={statName}
                onClick={() => setSelectedStat(statName)}
                className="py-2 rounded text-xs font-mono uppercase tracking-wider transition-all border text-center relative"
                style={{
                  color: isSelected ? info.colour : "#737373",
                  backgroundColor: isSelected ? `${info.colour}15` : "transparent",
                  borderColor: isSelected ? `${info.colour}50` : "#2a2a30",
                }}
              >
                <div className="font-bold">{statName}</div>
                {pts > 0 && (
                  <div
                    className="text-[8px] font-bold mt-0.5"
                    style={{ color: info.colour }}
                  >
                    {pts}pt
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected stat overview */}
        {currentStat && (
          <div
            className="border rounded-lg p-3 mb-4"
            style={{
              borderColor: `${statInfo.colour}30`,
              backgroundColor: `${statInfo.colour}08`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <span
                  className="text-xs font-mono font-bold uppercase tracking-wider"
                  style={{ color: statInfo.colour }}
                >
                  {selectedStat}
                </span>
                <span className="text-xs font-mono text-neutral-500 ml-2">
                  {statInfo.label}
                </span>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs font-bold" style={{ color: statInfo.colour }}>
                  Lv{currentStat.level}
                </div>
                <div className="text-[10px] text-neutral-500">
                  {currentStat.skill_points_available} pts available
                </div>
              </div>
            </div>
            {!branchesUnlocked && (
              <div className="mt-2 text-[10px] font-mono text-neutral-600">
                Branches unlock at Lv{BRANCH_UNLOCK_LEVEL} —{" "}
                {BRANCH_UNLOCK_LEVEL - currentStat.level} level{currentStat.level === BRANCH_UNLOCK_LEVEL - 1 ? "" : "s"} away
              </div>
            )}
          </div>
        )}

        {/* Branches */}
        {!branchesUnlocked ? (
          <div className="border border-neutral-800 rounded-lg p-6 text-center mb-4">
            <div className="text-neutral-600 font-mono text-xs uppercase tracking-wider">
              Branches locked
            </div>
            <div className="text-neutral-700 font-mono text-[10px] mt-1">
              Reach Lv{BRANCH_UNLOCK_LEVEL} in {selectedStat} to unlock
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {branches.map(({ branch_name, nodes }) => (
              <BranchPanel
                key={branch_name}
                branchName={branch_name}
                nodes={nodes}
                unlockedNodes={unlockedNodes}
                statColour={statInfo.colour}
                skillPoints={currentStat?.skill_points_available ?? 0}
                spending={spending}
                onSpend={handleSpend}
              />
            ))}
          </div>
        )}

        {/* Cross-stat specs */}
        <div className="mb-4">
          <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mb-3">
            Cross-Stat Specialisations
          </div>
          <div className="space-y-2">
            {CROSS_STAT_SPECS.map((spec) => {
              const isUnlocked = unlockedSpecs.has(spec.spec_name);
              const progress = Object.entries(spec.requirements).map(([statName, required]) => {
                const s = stats.find((st) => st.stat_name === statName);
                return {
                  stat: statName as StatName,
                  current: s?.level ?? 0,
                  required: required as number,
                  met: (s?.level ?? 0) >= (required as number),
                };
              });
              const allMet = progress.every((p) => p.met);

              return (
                <div
                  key={spec.spec_name}
                  className={`border rounded-lg p-3 transition-all ${
                    isUnlocked
                      ? "border-oc-amber/40 bg-oc-amber/5"
                      : allMet
                      ? "border-oc-green/40 bg-oc-green/5"
                      : "border-neutral-800 bg-neutral-900/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span
                        className={`text-xs font-mono font-bold uppercase tracking-wider ${
                          isUnlocked
                            ? "text-oc-amber"
                            : allMet
                            ? "text-oc-green"
                            : "text-neutral-400"
                        }`}
                      >
                        {spec.spec_name}
                      </span>
                      {isUnlocked && (
                        <span className="ml-2 text-[9px] font-mono text-oc-amber/70">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 mb-2">
                    {spec.description}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {progress.map((p) => (
                      <span
                        key={p.stat}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          p.met
                            ? "text-oc-green bg-oc-green/10"
                            : "text-neutral-500 bg-neutral-800"
                        }`}
                        style={
                          p.met
                            ? {}
                            : { color: STAT_INFO[p.stat].colour + "80" }
                        }
                      >
                        {p.stat} {p.current}/{p.required}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] font-mono text-oc-cyan/70">
                    {spec.bonusDescription}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface BranchPanelProps {
  branchName: string;
  nodes: StaticNode[];
  unlockedNodes: Set<string>;
  statColour: string;
  skillPoints: number;
  spending: string | null;
  onSpend: (node: StaticNode) => void;
}

function BranchPanel({
  branchName,
  nodes,
  unlockedNodes,
  statColour,
  skillPoints,
  spending,
  onSpend,
}: BranchPanelProps) {
  // Check if any node in this branch has a prereq from another branch (cross-branch prereqs not used here)
  // Simple linear depth-based tree: depth 1 → 2 → 3

  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <div
        className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest"
        style={{ color: statColour, backgroundColor: `${statColour}10`, borderBottom: `1px solid ${statColour}20` }}
      >
        {branchName}
      </div>
      <div className="divide-y divide-neutral-800">
        {nodes.map((node) => {
          const isUnlocked = unlockedNodes.has(node.node_name);
          const prereqMet = node.requires === null || unlockedNodes.has(node.requires);
          const canUnlock = !isUnlocked && prereqMet && skillPoints >= node.cost;
          const blockedByPrereq = !prereqMet;
          const blockedByPoints = prereqMet && !isUnlocked && skillPoints < node.cost;

          return (
            <div
              key={node.node_name}
              className={`p-3 flex items-start justify-between gap-3 transition-colors ${
                isUnlocked ? "bg-neutral-900/50" : "bg-transparent"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {/* Depth indicator */}
                  <span className="text-[8px] font-mono text-neutral-700 shrink-0">
                    {"▸".repeat(node.depth)}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold uppercase tracking-wider ${
                      isUnlocked
                        ? ""
                        : blockedByPrereq
                        ? "text-neutral-600"
                        : "text-neutral-300"
                    }`}
                    style={isUnlocked ? { color: statColour } : {}}
                  >
                    {node.node_name}
                  </span>
                  {isUnlocked && (
                    <span className="text-[9px] font-mono text-oc-green/60">ACTIVE</span>
                  )}
                </div>
                <div
                  className={`text-[10px] font-mono ml-4 ${
                    isUnlocked
                      ? "text-neutral-400"
                      : blockedByPrereq
                      ? "text-neutral-700"
                      : "text-neutral-500"
                  }`}
                >
                  {node.description}
                </div>
                {node.requires && !isUnlocked && blockedByPrereq && (
                  <div className="text-[9px] font-mono text-neutral-700 ml-4 mt-0.5">
                    Requires: {node.requires}
                  </div>
                )}
              </div>

              <div className="shrink-0 text-right">
                {isUnlocked ? (
                  <div
                    className="w-8 h-8 rounded border flex items-center justify-center text-xs font-mono"
                    style={{ borderColor: `${statColour}40`, color: statColour }}
                  >
                    ✓
                  </div>
                ) : canUnlock ? (
                  <button
                    onClick={() => onSpend(node)}
                    disabled={spending === node.node_name}
                    className="w-8 h-8 rounded border border-oc-cyan/50 bg-oc-cyan/5 flex items-center justify-center text-[10px] font-mono text-oc-cyan hover:bg-oc-cyan/15 hover:border-oc-cyan active:scale-95 transition-all disabled:opacity-50"
                    title={`Spend ${node.cost} skill point${node.cost !== 1 ? "s" : ""}`}
                  >
                    {spending === node.node_name ? "…" : node.cost}
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded border border-neutral-800 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-neutral-700">
                      {blockedByPoints ? node.cost : "🔒"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
