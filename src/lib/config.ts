// Central feature-flag config. Every external integration is optional: when its
// env vars are absent the app degrades gracefully to a local demo mode, so the
// project always builds and runs. Set the vars in .env.local for production.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  openaiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  embedModel: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
  stripeSecret: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  stripePrices: {
    starter: process.env.STRIPE_PRICE_STARTER || "",
    pro: process.env.STRIPE_PRICE_PRO || "",
    scale: process.env.STRIPE_PRICE_SCALE || "",
  },
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};

export const features = {
  get supabase() {
    return !!(env.supabaseUrl && env.supabaseAnonKey);
  },
  get supabaseAdmin() {
    return !!(env.supabaseUrl && env.supabaseServiceKey);
  },
  get openai() {
    return !!env.openaiKey;
  },
  get stripe() {
    return !!env.stripeSecret;
  },
};

// Semantic (embedding) retrieval needs both a vector store and an embedder.
export const semanticSearchEnabled = () => features.supabaseAdmin && features.openai;
