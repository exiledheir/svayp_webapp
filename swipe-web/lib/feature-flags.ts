/**
 * Feature Flags
 * ─────────────
 * Toggle product features on/off without a full redeploy.
 *
 * HOW TO USE
 * ----------
 * Edit the values below, then push to production.
 *
 * For instant runtime toggling without a redeploy you can instead set
 * environment variables in your hosting dashboard (Vercel / Railway etc.):
 *
 *   NEXT_PUBLIC_FF_PLANS_ENABLED=false
 *
 * The code reads the env var first, then falls back to the hardcoded default.
 */

// IMPORTANT: Next.js only inlines NEXT_PUBLIC_* env vars into the CLIENT bundle
// when they are referenced as a *static literal* (process.env.NEXT_PUBLIC_FOO).
// A dynamic lookup (process.env[key]) is NOT replaced and reads as undefined in
// the browser — so each flag below must pass the already-resolved value here.
function toBool(val: string | undefined, defaultValue: boolean): boolean {
  if (val === 'true') return true;
  if (val === 'false') return false;
  return defaultValue;
}

export const FEATURES = {
  /**
   * plansEnabled
   * When FALSE:
   *  - Plan badge (Free / Trial / Pro) in the header is hidden
   *  - Crown icon button in the header is hidden
   *  - "New outfit" generate button is always enabled (no gate)
   *  - "Try it on" button is always enabled (no gate)
   *  - "Add item" limit check is skipped
   *  - PremiumGate / upgrade modals never open
   *  - OutfitSection regenerate button has no usage counter
   */
  plansEnabled: toBool(process.env.NEXT_PUBLIC_FF_PLANS_ENABLED, true),

  /**
   * closetV2 — Acloset-style add & try-on redesign.
   * When TRUE:
   *  - "Build your closet" low-item home state (hero + docked progress + "＋ Add item" pill FAB)
   *  - New add sheet (Gallery / Camera rows + inline shop-catalog instant add)
   *  - Post-upload detect & review sheet
   *  - Item detail sheet v2 (AI attributes surfaced + wear tracking + try-on)
   * Works against today's backend; safe to ship dark and flip on for QA.
   */
  closetV2: toBool(process.env.NEXT_PUBLIC_FF_CLOSET_V2, false),

  /**
   * beautifyEnabled — opt-in on-demand Beautify (original vs enhanced, user chooses).
   * Requires the backend beautify job endpoints; keep FALSE until they ship.
   */
  beautifyEnabled: toBool(process.env.NEXT_PUBLIC_FF_BEAUTIFY, false),

  /**
   * libraryEnabled — inline "Add from the shop" catalog strip in the add sheet.
   * Uses the existing catalog API; interim add path fetches the product image and
   * runs the normal upload until the /wardrobe/items/from-catalog endpoint ships.
   */
  libraryEnabled: toBool(process.env.NEXT_PUBLIC_FF_LIBRARY, false),

  // profileEnabled is no longer a static flag — it is driven at runtime by the
  // `feature.subscription_badge.enabled` flag (scoped to one account).
  // See lib/feature-flags-context.tsx.
} as const;
