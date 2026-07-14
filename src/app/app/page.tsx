"use client";

import { useRef, useState } from "react";
import { SAMPLE_RFP } from "@/lib/sampleRfp";
import { seedLibrary, LibraryEntry } from "@/lib/library";

type Snippet = { id: string; topic: string; content: string };
type Question = {
  id: string;
  requirement: string;
  topic_keywords: string[];
  snippets: Snippet[];
};
type Draft = { answer: string; gaps: string; approved: boolean; loading: boolean };

export default function AppPage() {
  const [rfp, setRfp] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [library, setLibrary] = useState<LibraryEntry[]>(seedLibrary);
  const [mode, setMode] = useState<"llm" | "mock" | null>(null);
  const [retrieval, setRetrieval] = useState<"semantic" | "keyword" | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [notice, setNotice] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onUpload(file: File) {
    setUploading(true);
    setNotice("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRfp(data.text || "");
    } catch (e: any) {
      setNotice("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  async function analyze() {
    if (!rfp.trim()) return;
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfpText: rfp, library }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setNotice(data.error || "Plan limit reached.");
        return;
      }
      if (data.error) throw new Error(data.error);
      setMode(data.mode);
      setRetrieval(data.retrievalMode || null);
      setQuestions(data.questions);
      setStep(2);
      const init: Record<string, Draft> = {};
      data.questions.forEach((q: Question) => {
        init[q.id] = { answer: "", gaps: "", approved: false, loading: true };
      });
      setDrafts(init);
      for (const q of data.questions as Question[]) draftOne(q);
    } catch (e: any) {
      setNotice("Analyze failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function draftOne(q: Question) {
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement: q.requirement, snippets: q.snippets }),
      });
      const data = await res.json();
      setDrafts((prev) => ({
        ...prev,
        [q.id]: { answer: data.answer || "", gaps: data.gaps || "", approved: false, loading: false },
      }));
    } catch {
      setDrafts((prev) => ({
        ...prev,
        [q.id]: { answer: "", gaps: "draft failed", approved: false, loading: false },
      }));
    }
  }

  function updateAnswer(id: string, val: string) {
    setDrafts((p) => ({ ...p, [id]: { ...p[id], answer: val } }));
  }

  async function approve(q: Question) {
    const answer = drafts[q.id]?.answer || "";
    setDrafts((p) => ({ ...p, [q.id]: { ...p[q.id], approved: true } }));
    setLibrary((prev) => [
      ...prev,
      { id: "won-" + q.id + "-" + Date.now(), topic: q.topic_keywords.join(" "), content: answer },
    ]);
    // Persist to the workspace library (embedded) when in production; no-op in demo.
    fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: q.topic_keywords.join(" "), content: answer }),
    }).catch(() => {});
  }

  function exportDoc() {
    const rows = questions
      .map((q) => {
        const d = drafts[q.id];
        return `<h3>${q.id} — ${escapeHtml(q.requirement)}</h3><p>${escapeHtml(d?.answer || "")}</p>`;
      })
      .join("");
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>Proposal</title></head><body><h1>Proposal Response</h1>${rows}</body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BidGenix-proposal.doc";
    a.click();
    URL.revokeObjectURL(url);
  }

  const approvedCount = Object.values(drafts).filter((d) => d.approved).length;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-7 w-7 rounded-md bg-gradient-to-br from-brand to-blue-400" />
          <span className="text-xl font-extrabold">BidGenix</span>
        </div>
        <div className="flex items-center gap-3">
          {retrieval && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              {retrieval === "semantic" ? "pgvector search" : "keyword search"}
            </span>
          )}
          {mode && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                mode === "llm" ? "bg-green-50 text-accent" : "bg-amber-50 text-amber-600"
              }`}
            >
              {mode === "llm" ? "● live LLM" : "● mock mode"}
            </span>
          )}
          <a href="/pricing" className="text-xs font-semibold text-slate-500 hover:text-brand">
            Billing
          </a>
        </div>
      </header>

      {notice && (
        <div className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}{" "}
          {notice.toLowerCase().includes("limit") && (
            <a href="/pricing" className="font-semibold underline">
              Upgrade →
            </a>
          )}
        </div>
      )}

      {step === 1 && (
        <section>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Turn an RFP into a drafted response</h1>
          <p className="mb-5 text-slate-500">
            Upload or paste the RFP. BidGenix extracts every requirement, retrieves matching answers
            from your library, and drafts a response you review.
          </p>
          <textarea
            className="h-64 w-full rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm outline-none focus:border-brand"
            placeholder="Paste RFP text here…"
            value={rfp}
            onChange={(e) => setRfp(e.target.value)}
          />
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={analyze}
              disabled={busy || !rfp.trim()}
              className="rounded-lg bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-40"
            >
              {busy ? "Analyzing…" : "Analyze RFP"}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-slate-200 bg-white px-6 py-3 font-semibold text-brand hover:border-brand disabled:opacity-50"
            >
              {uploading ? "Reading file…" : "Upload PDF / DOCX"}
            </button>
            <button
              onClick={() => setRfp(SAMPLE_RFP)}
              className="rounded-lg border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-600 hover:border-slate-400"
            >
              Load sample RFP
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Drafted response</h1>
              <p className="text-sm text-slate-500">
                {questions.length} requirements · {approvedCount} approved · library now has{" "}
                {library.length} entries
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400"
              >
                ← New RFP
              </button>
              <button
                onClick={exportDoc}
                className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Export to Word
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q) => {
              const d = drafts[q.id];
              return (
                <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-2 text-sm font-semibold text-slate-700">
                    <span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {q.id}
                    </span>
                    {q.requirement}
                  </div>
                  {d?.loading ? (
                    <div className="animate-pulse text-sm text-slate-400">Drafting…</div>
                  ) : (
                    <>
                      <textarea
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-brand"
                        rows={4}
                        value={d?.answer || ""}
                        onChange={(e) => updateAnswer(q.id, e.target.value)}
                      />
                      {d?.gaps && (
                        <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          ⚠ Gap to fill: {d.gaps}
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          Sources: {q.snippets.map((s) => s.topic.split(" ")[0]).join(", ")}
                        </span>
                        <button
                          onClick={() => approve(q)}
                          disabled={d?.approved}
                          className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
                            d?.approved ? "bg-green-50 text-accent" : "bg-brand text-white hover:bg-brand-dark"
                          }`}
                        >
                          {d?.approved ? "✓ Approved → in library" : "Approve"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <footer className="mt-12 text-center text-xs text-slate-400">
        BidGenix · answers grounded in your library · pgvector semantic search in production
      </footer>
    </main>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
