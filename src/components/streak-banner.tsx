"use client";

import { useEffect, useState } from "react";
import { getStreakStatus } from "@/lib/streak";
import type { Profile } from "@/lib/types";

interface StreakBannerProps {
  profile: Profile;
  evalMessage: string | null;
}

export function StreakBanner({ profile, evalMessage }: StreakBannerProps) {
  const [visible, setVisible] = useState(true);
  const status = getStreakStatus(profile.streak_days, profile.last_active_date);

  // Auto-dismiss eval messages after 8 seconds
  useEffect(() => {
    if (evalMessage) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [evalMessage]);

  // Death tax / freeze notification
  if (evalMessage && visible) {
    const isDeath = evalMessage.includes("DAMAGE");
    return (
      <div
        className={`mb-4 p-3 rounded-lg border font-mono text-xs transition-all ${
          isDeath
            ? "border-oc-magenta/50 bg-oc-magenta/10 text-oc-magenta"
            : "border-oc-amber/50 bg-oc-amber/10 text-oc-amber"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>{evalMessage}</div>
          <button
            onClick={() => setVisible(false)}
            className="text-neutral-500 hover:text-neutral-300 shrink-0"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // At-risk warning
  if (status.status === "at_risk") {
    return (
      <div className="mb-4 p-3 rounded-lg border border-oc-amber/40 bg-oc-amber/5 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="text-oc-amber animate-pulse">⚠</span>
          <span className="text-oc-amber">
            STREAK AT RISK — {profile.streak_days}-day streak expires in{" "}
            {status.hoursRemaining}h.
          </span>
        </div>
        <div className="text-neutral-500 mt-1">
          Complete any mission to maintain uptime.
        </div>
      </div>
    );
  }

  // Active streak milestone callouts
  if (
    profile.streak_days > 0 &&
    profile.streak_days % 7 === 0 &&
    status.status === "active"
  ) {
    return (
      <div className="mb-4 p-3 rounded-lg border border-oc-green/30 bg-oc-green/5 font-mono text-xs">
        <span className="text-oc-green">
          {profile.streak_days}-DAY STREAK
        </span>
        <span className="text-neutral-500">
          {" "}
          — System stability holding. Multiplier: {profile.streak_multiplier}×
        </span>
      </div>
    );
  }

  return null;
}
