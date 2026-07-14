// Plan definitions and monthly RFP quotas. Enforced server-side in the extract
// route when Supabase is configured; in demo mode quotas are not enforced.

export type PlanId = "trial" | "starter" | "pro" | "scale";

export const PLANS: Record<
  PlanId,
  { name: string; priceMonthly: number; rfpsPerMonth: number; seats: number }
> = {
  trial: { name: "Trial", priceMonthly: 0, rfpsPerMonth: 3, seats: 1 },
  starter: { name: "Starter", priceMonthly: 49, rfpsPerMonth: 8, seats: 1 },
  pro: { name: "Pro", priceMonthly: 79, rfpsPerMonth: 15, seats: 3 },
  scale: { name: "Scale", priceMonthly: 199, rfpsPerMonth: 60, seats: 10 },
};

export function quotaFor(plan: string): number {
  return PLANS[(plan as PlanId)]?.rfpsPerMonth ?? PLANS.trial.rfpsPerMonth;
}
