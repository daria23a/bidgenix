import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-7 w-7 rounded-md bg-gradient-to-br from-brand to-blue-400" />
          <span className="text-lg font-extrabold">BidGenix</span>
        </div>
        <div className="flex items-center gap-5 text-sm font-semibold text-slate-600">
          <Link href="/pricing" className="hover:text-brand">Pricing</Link>
          <Link href="/login" className="hover:text-brand">Sign in</Link>
          <Link
            href="/app"
            className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark"
          >
            Try it free
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10 text-center">
        <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-brand">
          RFP responses in minutes, not days
        </span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Win more bids. Draft RFP responses from your own answers.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-500">
          Upload an RFP or security questionnaire. BidGenix extracts every requirement, retrieves
          matching answers from your library with semantic search, and drafts a grounded response you
          review and export. It never invents facts.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/app"
            className="rounded-lg bg-brand px-7 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            Analyze an RFP free
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-slate-200 px-7 py-3 font-semibold text-slate-700 hover:border-brand"
          >
            See pricing
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-400">No credit card to start · $79/mo Pro · founding deal available</p>
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 px-6 pb-20 sm:grid-cols-3">
        {[
          { t: "Extract", d: "Every requirement pulled from the RFP automatically." },
          { t: "Retrieve", d: "Semantic search over your past answers (pgvector)." },
          { t: "Draft & approve", d: "Grounded drafts you edit, approve, and export to Word." },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border border-slate-200 p-5">
            <div className="text-sm font-bold text-brand">{f.t}</div>
            <div className="mt-1 text-sm text-slate-500">{f.d}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
