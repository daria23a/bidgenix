import { getServerSupabase } from "@/lib/supabase/server";

export type Workspace = {
  id: string;
  name: string;
  plan: string;
  rfp_count_this_period: number;
  stripe_customer_id: string | null;
};

// Resolve the current user's primary workspace (owner-created on signup).
// Returns null in demo mode or when unauthenticated.
export async function getCurrentWorkspace(): Promise<Workspace | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return null;

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, name, plan, rfp_count_this_period, stripe_customer_id")
    .eq("id", membership.workspace_id)
    .maybeSingle();
  return (ws as Workspace) || null;
}
