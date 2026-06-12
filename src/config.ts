// Distribution configuration.

/** Hosted Stripe checkout for the themes subscription (LIVE). */
export const CHECKOUT_URL = "https://buy.stripe.com/3cI8wPe2zg1r3Dt5KQ87K01";

/** License validation endpoint (workers/license). Empty string = not
 * deployed → the Theme tab shows a dev-unlock fallback instead of real
 * activation. */
export const LICENSE_API = "https://usage-widget-license.dubziik.workers.dev";

/** Re-validate a stored license this often; keep entitlement through
 * transient failures for the grace period. */
export const LICENSE_REVALIDATE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
export const LICENSE_GRACE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
