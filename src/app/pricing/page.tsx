"use client";

import { useState } from "react";
import { PLANS, PlanId } from "@/lib/plan";

const ORDER: PlanId[] = ["starter", "pro", "scale"];

export default function PricingPage() {
  const [loading, setLoading] = useState<string>("");
  const [error, setError] = useState("");

  async function checkout(plan: PlanId) {
    setLoading(plan);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Checkout unavailable. Configure Stripe to enable billing.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900">Simple, honest pricing</h1>
        <p className="mt-2 text-slate-500">
          Start free. Upgrade when RFPs pile up. Founding customers get 50% off for life.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        {ORDER.map((id) => {
          const p = PLANS[id];
          const featured = id === "pro";
          return (
            <div
              key={id}
              className={`rounded-2xl border p-6 ${
                featured ? "border-brand shadow-lg" : "border-slate-200"
              }`}
            >
              {featured && (
                <span className="mb-2 inline-block rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <div className="text-lg font-bold text-slate-900">{p.name}</div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">
                ${p.priceMonthly}
                <span className="text-base font-medium text-slate-400">/mo</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>{p.rfpsPerMonth} RFPs / month</li>
                <li>{p.seats} seat{p.seats > 1 ? "s" : ""}</li>
                <li>Semantic answer library</li>
                <li>PDF / DOCX upload · Word export</li>
              </ul>
              <button
                onClick={() => checkout(id)}
                disabled={loading === id}
                className={`mt-6 w-full rounded-lg py-2.5 text-sm font-semibold ${
                  featured
                    ? "bg-brand text-white hover:bg-brand-dark"
                    : "border border-slate-300 text-slate-700 hover:border-brand"
                } disabled:opacity-50`}
              >
                {loading === id ? "Redirecting…" : "Choose " + p.name}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Prices in USD. Cancel anytime from the billing portal.
      </p>
    </main>
  );
}
