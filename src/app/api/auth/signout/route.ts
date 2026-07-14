import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { env } from "@/lib/config";

export const runtime = "nodejs";

export async function POST() {
  const supabase = getServerSupabase();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(`${env.siteUrl}/login`, { status: 303 });
}
