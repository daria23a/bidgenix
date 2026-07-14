import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { embed } from "@/lib/embeddings";

export const runtime = "nodejs";

// Save an approved answer back into the workspace answer library, embedding it
// for future semantic retrieval. This is the compounding-moat loop. In demo
// mode (no Supabase) it is a no-op that echoes success so the UI stays simple.
export async function POST(req: NextRequest) {
  try {
    const { topic, content } = (await req.json()) as {
      topic: string;
      content: string;
    };
    if (!content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const workspace = await getCurrentWorkspace();
    const admin = getAdminSupabase();
    if (!workspace || !admin) {
      return NextResponse.json({ saved: false, mode: "demo" });
    }

    const embedding = await embed(`${topic || ""}\n${content}`).catch(() => null);
    const { error } = await admin.from("answer_library").insert({
      workspace_id: workspace.id,
      topic: topic || "general",
      content,
      embedding,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ saved: true, mode: "db" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "save failed" }, { status: 500 });
  }
}
