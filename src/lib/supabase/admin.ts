import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env, features } from "@/lib/config";

// Service-role client for privileged server work (embeddings, RPC, webhooks).
// Never import this into client components.
let cached: SupabaseClient | null = null;

export function getAdminSupabase(): SupabaseClient | null {
  if (!features.supabaseAdmin) return null;
  if (cached) return cached;
  cached = createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
