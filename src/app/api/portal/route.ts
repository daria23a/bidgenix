import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getCurrentWorkspace } from "@/lib/workspace";
import { env } from "@/lib/config";

export const runtime = "nodejs";

// Open the Stripe billing portal so a customer can manage/cancel their plan.
export async function POST() {
  try {
    const stripe = getStripe();
    const workspace = await getCurrentWorkspace();
    if (!stripe || !workspace?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account found." }, { status: 400 });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: workspace.stripe_customer_id,
      return_url: `${env.siteUrl}/app`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "portal failed" }, { status: 500 });
  }
}
