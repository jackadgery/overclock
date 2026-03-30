"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // Auto-confirm is on by default in Supabase for new projects
        // Sign in immediately after signup
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* System boot header */}
        <div className="mb-8 font-mono">
          <div className="text-xs text-oc-cyan/50 mb-1">
            SYS.AUTH v1.0 // IDENTITY VERIFICATION
          </div>
          <h1 className="text-2xl font-bold text-oc-cyan tracking-wider">
            OVERCLOCK
          </h1>
          <div className="text-xs text-neutral-500 mt-1">
            {isSignUp ? "// NEW OPERATOR REGISTRATION" : "// OPERATOR LOGIN"}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-mono text-neutral-500 mb-1 uppercase tracking-wider"
            >
              Operator ID
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-oc-cyan focus:ring-1 focus:ring-oc-cyan/30 transition-colors"
              placeholder="operator@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-mono text-neutral-500 mb-1 uppercase tracking-wider"
            >
              Access Key
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-oc-cyan focus:ring-1 focus:ring-oc-cyan/30 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-xs font-mono text-oc-magenta bg-oc-magenta/10 border border-oc-magenta/30 rounded px-3 py-2">
              SYS.ERR: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-oc-cyan/10 border border-oc-cyan/50 text-oc-cyan font-mono text-sm py-2 rounded hover:bg-oc-cyan/20 hover:border-oc-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {loading
              ? "Authenticating..."
              : isSignUp
                ? "Register Operator"
                : "Authenticate"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs font-mono text-neutral-500 hover:text-oc-cyan transition-colors"
          >
            {isSignUp
              ? "// Existing operator? Authenticate"
              : "// New operator? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
