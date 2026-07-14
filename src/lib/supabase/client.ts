"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client. Uses public env vars (available at build time via
// NEXT_PUBLIC_*). Returns null in demo mode.
export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createBrowserClient(url, anon);
}
