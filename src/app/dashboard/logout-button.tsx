"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs font-mono text-neutral-500 hover:text-oc-magenta border border-neutral-700 hover:border-oc-magenta/50 px-3 py-1 rounded transition-colors uppercase tracking-wider"
    >
      Disconnect
    </button>
  );
}
