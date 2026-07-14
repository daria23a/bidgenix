import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env, features } from "@/lib/config";

// Server-side Supabase client bound to the request cookies. Returns null when
// Supabase isn't configured so callers can fall back to demo mode.
export function getServerSupabase() {
  if (!features.supabase) return null;
  const cookieStore = cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items: { name: string; value: string; options?: any }[]) {
        try {
          items.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // called from a Server Component without a mutable cookie store — ignore
        }
      },
    },
  });
}

export async function getCurrentUser() {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
