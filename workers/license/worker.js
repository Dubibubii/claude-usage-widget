// License validation worker (Cloudflare Workers).
//
// Model: purchase-email lookup — no webhooks, no key issuance. The widget
// sends the email used at checkout; we ask Stripe whether that customer has
// an active subscription to the themes price. Cosmetic-unlock stakes make
// this the right complexity level for v1.
//
// Deploy:
//   cd workers/license
//   wrangler secret put STRIPE_SECRET_KEY   # sk_live_... (or sk_test_ for staging)
//   wrangler deploy
// wrangler.toml vars: PRICE_ID = the themes price (price_...).
//
// POST /validate  {"email": "..."}  →  {"active": true|false}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/validate") {
      return json({ error: "not found" }, 404);
    }

    let email;
    try {
      ({ email } = await request.json());
    } catch {
      return json({ error: "bad request" }, 400);
    }
    if (typeof email !== "string" || !email.includes("@") || email.length > 200) {
      return json({ active: false });
    }

    // comp entitlements (owner, gifts) — comma-separated emails in the
    // ALLOWLIST secret, so no address ever appears in the public source
    const allow = (env.ALLOWLIST ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allow.includes(email.trim().toLowerCase())) return json({ active: true });

    try {
      // exact-email list filter, NOT /search: search indexing lags ~a minute
      // behind new objects, which would fail customers who activate right
      // after checkout — the moment they're most likely to try
      const search = await stripe(
        env,
        `customers?email=${encodeURIComponent(email.trim())}&limit=10`,
      );
      for (const customer of search.data ?? []) {
        const subs = await stripe(
          env,
          `subscriptions?customer=${customer.id}&status=active&price=${env.PRICE_ID}&limit=1`,
        );
        if ((subs.data ?? []).length > 0) return json({ active: true });
      }
      return json({ active: false });
    } catch (e) {
      return json({ error: "stripe unavailable" }, 502);
    }
  },
};

async function stripe(env, path) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (!r.ok) throw new Error(`stripe ${r.status}`);
  return r.json();
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
