"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = getBrowserSupabase();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const demo = !supabase;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");
    const result = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (result.error) {
      console.error("Supabase auth error:", result.error);
      setError(result.error.message || JSON.stringify(result.error));
    }
    else setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg bg-indigo-600" />
          <span className="font-bold text-slate-900">BidGenix</span>
        </div>

        {demo ? (
          <div className="space-y-4">
            <h1 className="text-lg font-semibold text-slate-900">Demo mode</h1>
            <p className="text-sm text-slate-500">
              Supabase isn&apos;t configured, so authentication is disabled. Open{" "}
              <a href="/app" className="text-indigo-600 underline">
                the app
              </a>{" "}
              directly. Add your Supabase keys in <code>.env.local</code> to enable
              real sign-in.
            </p>
          </div>
        ) : sent ? (
          <div className="space-y-3">
            <h1 className="text-lg font-semibold text-slate-900">Check your email</h1>
            <p className="text-sm text-slate-500">
              We sent a magic sign-in link to <b>{email}</b>.
            </p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-4">
            <h1 className="text-lg font-semibold text-slate-900">Sign in</h1>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Email me a magic link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
