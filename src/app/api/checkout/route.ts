import { NextRequest, NextResponse } from "next/server";
import { getStripe, priceIdForPlan } from "@/lib/stripe";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getCurrentUser } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { env } from "@/lib/config";

export const runtime = "nodejs";

// Create a Stripe Checkout session for a plan and redirect the user to it.
export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Billing is not configured." }, { status: 501 });
    }
    const { plan } = (await req.json()) as { plan: "starter" | "pro" | "scale" };
    const price = priceIdForPlan(plan);
    if (!price) {
      return NextResponse.json({ error: `No price configured for ${plan}` }, { status: 400 });
    }

    const user = await getCurrentUser();
    const workspace = await getCurrentWorkspace();
    if (!user || !workspace) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    // Ensure a Stripe customer exists for the workspace.
    let customerId = workspace.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { workspace_id: workspace.id },
      });
      customerId = customer.id;
      const admin = getAdminSupabase();
      await admin
        ?.from("workspaces")
        .update({ stripe_customer_id: customerId })
        .eq("id", workspace.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${env.siteUrl}/app?checkout=success`,
      cancel_url: `${env.siteUrl}/pricing?checkout=cancelled`,
      subscription_data: { metadata: { workspace_id: workspace.id } },
      metadata: { workspace_id: workspace.id, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "checkout failed" }, { status: 500 });
  }
}
