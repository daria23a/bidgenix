import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, planForPriceId } from "@/lib/stripe";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { env } from "@/lib/config";

export const runtime = "nodejs";

// Stripe sends the raw body; we must verify the signature against it.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const admin = getAdminSupabase();
  if (!stripe || !env.stripeWebhookSecret) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 501 });
  }

  const sig = req.headers.get("stripe-signature") || "";
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.stripeWebhookSecret);
  } catch (e: any) {
    return NextResponse.json({ error: `Invalid signature: ${e?.message}` }, { status: 400 });
  }

  async function applyPlan(workspaceId: string | undefined, plan: string | null, sub?: Stripe.Subscription) {
    if (!workspaceId || !admin) return;
    if (plan) {
      await admin.from("workspaces").update({ plan }).eq("id", workspaceId);
    }
    await admin.from("subscriptions").upsert({
      workspace_id: workspaceId,
      stripe_subscription_id: sub?.id,
      status: sub?.status,
      plan,
      current_period_end: sub?.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const wsId = s.metadata?.workspace_id;
        const plan = (s.metadata?.plan as string) || null;
        let sub: Stripe.Subscription | undefined;
        if (s.subscription) {
          sub = await stripe.subscriptions.retrieve(s.subscription as string);
        }
        await applyPlan(wsId, plan, sub);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const wsId = sub.metadata?.workspace_id;
        const priceId = sub.items.data[0]?.price?.id;
        const plan = planForPriceId(priceId);
        await applyPlan(wsId, plan, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await applyPlan(sub.metadata?.workspace_id, "trial", sub);
        break;
      }
      default:
        break;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
