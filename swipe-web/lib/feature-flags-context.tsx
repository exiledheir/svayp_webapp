import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSubscriptionBadgeEnabled, getMarketEnabled } from '@/lib/api';
import { getUserProfile } from '@/lib/wardrobe-api';
import { getUser, isAuthenticated } from '@/lib/auth';

interface FeatureFlagsState {
  /** Both flags are driven by the FRONTEND-only `feature.subscription_badge.enabled`
   *  flag — but only for the scoped account(s) below. */
  plansEnabled: boolean;
  profileEnabled: boolean;
  /** C2C Market gating. `marketEnabled` is true when the backend
   *  `feature.market_enabled` flag is on (global launch) OR the signed-in user's
   *  phone is in MARKET_ALLOWED_PHONES (early-access allowlist). `marketResolved`
   *  is false until the flag + phone check completes, so pages can avoid
   *  flashing the Market to non-allowed users. */
  marketEnabled: boolean;
  marketResolved: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsState>({
  plansEnabled: true,
  profileEnabled: true,
  marketEnabled: false,
  marketResolved: false,
});

// `feature.subscription_badge.enabled` only applies to these phone number(s).
// Everyone else always sees the subscription badge / premium UI regardless of
// the flag; the flag can only toggle it for the account(s) listed here, so it
// can never affect any other user. Compared by digits-only so formatting
// (+998…, spaces) doesn't matter.
const FLAG_SCOPED_PHONES = ['998909958022'];

// Early-access allowlist for the C2C Market. These accounts get the full Market
// even while `feature.market_enabled` is off; everyone else sees "coming soon"
// until the flag is flipped on globally. Digits-only (no +, spaces).
const MARKET_ALLOWED_PHONES = ['998909958022', '998946830545', '998900221201', '998971058844'];

function normalizePhone(phone?: string): string {
  return (phone ?? '').replace(/\D/g, '');
}

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  // Defaults: subscription visible for everyone while loading; Market hidden
  // (coming soon) until the flag + allowlist check resolves.
  const [flags, setFlags] = useState<FeatureFlagsState>({
    plansEnabled: true,
    profileEnabled: true,
    marketEnabled: false,
    marketResolved: false,
  });

  useEffect(() => {
    Promise.all([
      getSubscriptionBadgeEnabled(),
      getMarketEnabled(),
      // Only fetch the profile when signed in. A logged-out /me returns 401, which
      // trips the axios interceptor into a login redirect — pointless here since a
      // guest has no phone for the allowlist anyway.
      isAuthenticated()
        ? getUserProfile()
            .then((profile) => profile.phoneNumber)
            .catch(() => undefined)
        : Promise.resolve(undefined),
    ])
      .then(([badgeEnabled, marketFlag, profilePhone]) => {
        // Phone from the backend profile, falling back to the locally stored
        // user (the Flutter WebView injects it) so the allowlist works even if
        // the profile request is unavailable.
        const localUser = getUser();
        const phone = normalizePhone(
          profilePhone ??
            (localUser?.phone as string | undefined) ??
            (localUser?.username as string | undefined),
        );

        // Subscription badge: scoped account(s) follow the flag; everyone else on.
        const isScoped = FLAG_SCOPED_PHONES.includes(phone);
        const subEnabled = isScoped ? badgeEnabled : true;

        // Market: allowlisted accounts always on; everyone else follows the flag.
        const marketEnabled = MARKET_ALLOWED_PHONES.includes(phone) || marketFlag;

        setFlags({
          plansEnabled: subEnabled,
          profileEnabled: subEnabled,
          marketEnabled,
          marketResolved: true,
        });
      })
      .catch(() => {
        // Keep subscription defaults (on); mark Market resolved + off.
        setFlags((f) => ({ ...f, marketResolved: true }));
      });
  }, []);

  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagsState {
  return useContext(FeatureFlagsContext);
}

/**
 * Market access state for gating pages:
 *  - 'loading': flag/allowlist not yet resolved → render a neutral placeholder
 *  - 'enabled': user may use the Market
 *  - 'blocked': show "coming soon" (feed) or redirect to /market (sub-pages)
 */
export function useMarketAccess(): 'loading' | 'enabled' | 'blocked' {
  const { marketEnabled, marketResolved } = useFeatureFlags();
  if (!marketResolved) return 'loading';
  return marketEnabled ? 'enabled' : 'blocked';
}
