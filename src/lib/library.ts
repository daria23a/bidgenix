import libraryData from "../../data/library.json";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { embed } from "@/lib/embeddings";
import { semanticSearchEnabled } from "@/lib/config";

export type LibraryEntry = { id: string; topic: string; content: string };

export const seedLibrary: LibraryEntry[] = libraryData as LibraryEntry[];

// ---- Local keyword retrieval (demo mode / fallback) --------------------------
export function keywordRetrieve(
  keywords: string[],
  library: LibraryEntry[],
  k = 3,
): LibraryEntry[] {
  const tokens = new Set<string>();
  for (const kw of keywords) {
    for (const t of kw.toLowerCase().replace(/[\/,]/g, " ").split(/\s+/)) {
      if (t.length > 2) tokens.add(t);
    }
  }
  const scored = library.map((item) => {
    const hay = (item.topic + " " + item.content).toLowerCase();
    let score = 0;
    tokens.forEach((t) => {
      if (hay.includes(t)) score += 1;
    });
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const hits = scored.filter((s) => s.score > 0).slice(0, k).map((s) => s.item);
  return hits.length ? hits : scored.slice(0, 1).map((s) => s.item);
}

// ---- Production semantic retrieval (Supabase pgvector) -----------------------
// Embeds the query and calls the `match_library` RPC (cosine distance) scoped to
// a workspace. Falls back to keyword search on any failure so the flow never
// breaks.
export async function retrieveLibrary(opts: {
  workspaceId?: string | null;
  query: string;
  keywords: string[];
  fallbackLibrary?: LibraryEntry[];
  k?: number;
}): Promise<{ entries: LibraryEntry[]; mode: "semantic" | "keyword" }> {
  const { workspaceId, query, keywords, k = 3 } = opts;
  const fallback = opts.fallbackLibrary?.length ? opts.fallbackLibrary : seedLibrary;

  if (semanticSearchEnabled() && workspaceId) {
    try {
      const vector = await embed(query || keywords.join(" "));
      const admin = getAdminSupabase();
      if (vector && admin) {
        const { data, error } = await admin.rpc("match_library", {
          p_workspace: workspaceId,
          query_embedding: vector,
          match_count: k,
        });
        if (!error && Array.isArray(data) && data.length) {
          return {
            entries: data.map((d: any) => ({
              id: String(d.id),
              topic: d.topic,
              content: d.content,
            })),
            mode: "semantic",
          };
        }
      }
    } catch {
      // fall through to keyword search
    }
  }

  return { entries: keywordRetrieve(keywords, fallback, k), mode: "keyword" };
}
