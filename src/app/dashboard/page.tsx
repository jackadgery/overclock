import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen p-6">
      {/* System header */}
      <div className="flex items-center justify-between mb-8">
        <div className="font-mono">
          <div className="text-xs text-oc-cyan/50">
            SYS.CORE v1.0 // MAIN DIAGNOSTIC
          </div>
          <h1 className="text-xl font-bold text-oc-cyan tracking-wider">
            OVERCLOCK
          </h1>
        </div>
        <LogoutButton />
      </div>

      {/* Placeholder system status */}
      <div className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/50">
        <div className="font-mono text-xs text-neutral-500 mb-3 uppercase tracking-wider">
          System Status
        </div>
        <div className="font-mono text-sm text-neutral-400 space-y-1">
          <div>
            <span className="text-oc-green">●</span> Operator authenticated:{" "}
            <span className="text-neutral-300">{user.email}</span>
          </div>
          <div>
            <span className="text-oc-green">●</span> Database connection:{" "}
            <span className="text-oc-green">ONLINE</span>
          </div>
          <div>
            <span className="text-oc-amber">●</span> Subsystems:{" "}
            <span className="text-oc-amber">AWAITING INITIALISATION</span>
          </div>
          <div>
            <span className="text-neutral-600">●</span> Quest engine:{" "}
            <span className="text-neutral-600">NOT INSTALLED</span>
          </div>
          <div>
            <span className="text-neutral-600">●</span> Diagnostic scan:{" "}
            <span className="text-neutral-600">NOT INSTALLED</span>
          </div>
          <div>
            <span className="text-neutral-600">●</span> AI layer:{" "}
            <span className="text-neutral-600">NOT INSTALLED</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-neutral-800 font-mono text-xs text-neutral-600">
          Phase 0 complete. Scaffold operational. Awaiting Phase 1: Data Layer.
        </div>
      </div>
    </div>
  );
}
