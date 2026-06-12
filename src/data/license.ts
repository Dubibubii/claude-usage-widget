// License activation/validation client (workers/license backend).
// Model: the email used at Stripe checkout is the license identifier —
// the worker confirms an active themes subscription for it.

import { LICENSE_API } from "../config";

export type LicenseStatus = "active" | "inactive" | "unavailable";

export async function validateLicense(email: string): Promise<LicenseStatus> {
  if (!LICENSE_API) return "unavailable";
  try {
    const r = await fetch(`${LICENSE_API}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!r.ok) return "unavailable";
    const { active } = await r.json();
    return active ? "active" : "inactive";
  } catch {
    return "unavailable";
  }
}
