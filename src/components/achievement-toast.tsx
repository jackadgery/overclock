"use client";

import { useEffect, useState } from "react";
import type { AchievementDef } from "@/lib/achievements";

interface Props {
  achievements: AchievementDef[];
  onDismiss: () => void;
}

export function AchievementToast({ achievements, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievements.length === 0) return;
    // Brief delay so the animation fires after mount
    const showTimer = setTimeout(() => setVisible(true), 50);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, 4500);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [achievements, onDismiss]);

  if (achievements.length === 0) return null;

  return (
    <div
      className={`fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none transition-all duration-400 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      {achievements.map((a) => (
        <div
          key={a.key}
          className="achievement-glitch w-full max-w-sm font-mono border border-oc-amber/60 bg-oc-bg/95 rounded-lg px-4 py-3 shadow-[0_0_20px_rgba(255,184,0,0.2)] pointer-events-auto"
          onClick={() => {
            setVisible(false);
            setTimeout(onDismiss, 300);
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-oc-amber/60 uppercase tracking-widest mb-0.5">
                ACHIEVEMENT UNLOCKED
              </div>
              <div className="text-sm font-bold text-oc-amber tracking-wide truncate">
                {a.name}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed">
                {a.description}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs font-bold text-oc-amber">
                +{a.xp_bonus.toLocaleString()}
              </div>
              <div className="text-[9px] text-neutral-600 uppercase">XP</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
