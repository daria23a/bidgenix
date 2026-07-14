import { NextRequest, NextResponse } from "next/server";
import { draftAnswer } from "@/lib/llm";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { requirement, snippets } = (await req.json()) as {
      requirement: string;
      snippets: { topic: string; content: string }[];
    };
    if (!requirement) {
      return NextResponse.json({ error: "requirement is required" }, { status: 400 });
    }
    const { result, mode } = await draftAnswer(requirement, snippets || []);
    return NextResponse.json({ ...result, mode });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "draft failed" }, { status: 500 });
  }
}
