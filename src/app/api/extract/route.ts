import { NextRequest, NextResponse } from "next/server";
import { extractQuestions } from "@/lib/llm";
import { retrieveLibrary, seedLibrary, LibraryEntry } from "@/lib/library";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getServerSupabase } from "@/lib/supabase/server";
import { quotaFor } from "@/lib/plan";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { rfpText, library } = (await req.json()) as {
      rfpText: string;
      library?: LibraryEntry[];
    };
    if (!rfpText || !rfpText.trim()) {
      return NextResponse.json({ error: "rfpText is required" }, { status: 400 });
    }

    // --- Quota enforcement (only when authenticated in production) ---
    const workspace = await getCurrentWorkspace();
    if (workspace) {
      const limit = quotaFor(workspace.plan);
      if (workspace.rfp_count_this_period >= limit) {
        return NextResponse.json(
          {
            error: `Monthly RFP limit reached for the ${workspace.plan} plan (${limit}). Upgrade to continue.`,
            code: "quota_exceeded",
          },
          { status: 402 },
        );
      }
    }

    const fallback = library && library.length ? library : seedLibrary;
    const { questions, mode } = await extractQuestions(rfpText);

    // Retrieve grounding snippets per requirement (semantic when configured).
    let retrievalMode: "semantic" | "keyword" = "keyword";
    const enriched = await Promise.all(
      questions.map(async (q) => {
        const { entries, mode: rm } = await retrieveLibrary({
          workspaceId: workspace?.id,
          query: q.requirement,
          keywords: q.topic_keywords,
          fallbackLibrary: fallback,
        });
        retrievalMode = rm;
        return {
          ...q,
          snippets: entries.map((s) => ({ id: s.id, topic: s.topic, content: s.content })),
        };
      }),
    );

    // Persist the RFP + increment quota when in production.
    if (workspace) {
      const supabase = getServerSupabase();
      if (supabase) {
        await supabase
          .from("workspaces")
          .update({ rfp_count_this_period: workspace.rfp_count_this_period + 1 })
          .eq("id", workspace.id);
      }
    }

    return NextResponse.json({ questions: enriched, mode, retrievalMode });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "extract failed" }, { status: 500 });
  }
}
