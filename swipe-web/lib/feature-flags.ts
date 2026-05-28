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

function envFlag(key: string, defaultValue: boolean): boolean {
  if (typeof process !== 'undefined') {
    const val = process.env[key];
    if (val === 'true') return true;
    if (val === 'false') return false;
  }
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
  plansEnabled: envFlag('NEXT_PUBLIC_FF_PLANS_ENABLED', true),

  /**
   * profileEnabled
   * When FALSE:
   *  - Profile icon button in the closet header is hidden
   *  - Profile sheet cannot be opened
   *
   * Toggle via env var: NEXT_PUBLIC_FF_PROFILE_ENABLED=false
   */
  profileEnabled: envFlag('NEXT_PUBLIC_FF_PROFILE_ENABLED', true),
} as const;
