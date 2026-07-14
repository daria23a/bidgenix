import Stripe from "stripe";
import { env, features } from "@/lib/config";

// Lazily-created Stripe client. Returns null when no secret key is set.
let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!features.stripe) return null;
  if (cached) return cached;
  cached = new Stripe(env.stripeSecret, { apiVersion: "2024-06-20" });
  return cached;
}

export function priceIdForPlan(plan: "starter" | "pro" | "scale"): string {
  return env.stripePrices[plan];
}

export function planForPriceId(priceId: string | undefined): string | null {
  if (!priceId) return null;
  const entries = Object.entries(env.stripePrices) as [string, string][];
  const hit = entries.find(([, id]) => id && id === priceId);
  return hit ? hit[0] : null;
}
