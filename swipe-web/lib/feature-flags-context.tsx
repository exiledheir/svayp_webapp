import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSubscriptionBadgeEnabled } from '@/lib/api';
import { getUserProfile } from '@/lib/wardrobe-api';
import { getUser, isAuthenticated } from '@/lib/auth';

interface FeatureFlagsState {
  /** Both driven by the FRONTEND-only `feature.subscription_badge.enabled` flag,
   *  scoped to the account(s) below. (Market and Feed are no longer gated.) */
  plansEnabled: boolean;
  profileEnabled: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsState>({
  plansEnabled: true,
  profileEnabled: true,
});

// `feature.subscription_badge.enabled` only applies to these phone number(s).
// Everyone else always sees the subscription badge / premium UI regardless of
// the flag; the flag can only toggle it for the account(s) listed here.
// Compared by digits-only so formatting (+998…, spaces) doesn't matter.
const FLAG_SCOPED_PHONES = ['998909958022'];

function normalizePhone(phone?: string): string {
  return (phone ?? '').replace(/\D/g, '');
}

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlagsState>({
    plansEnabled: true,
    profileEnabled: true,
  });

  useEffect(() => {
    Promise.all([
      getSubscriptionBadgeEnabled(),
      // Only fetch the profile when signed in. A logged-out /me returns 401, which
      // trips the axios interceptor into a login redirect.
      isAuthenticated()
        ? getUserProfile()
            .then((profile) => profile.phoneNumber)
            .catch(() => undefined)
        : Promise.resolve(undefined),
    ])
      .then(([badgeEnabled, profilePhone]) => {
        // Phone from the backend profile, falling back to the locally stored
        // user (the Flutter WebView injects it).
        const localUser = getUser();
        const phone = normalizePhone(
          profilePhone ??
            (localUser?.phone as string | undefined) ??
            (localUser?.username as string | undefined),
        );

        // Subscription badge: scoped account(s) follow the flag; everyone else on.
        const isScoped = FLAG_SCOPED_PHONES.includes(phone);
        const subEnabled = isScoped ? badgeEnabled : true;

        setFlags({ plansEnabled: subEnabled, profileEnabled: subEnabled });
      })
      .catch(() => {
        // Keep subscription defaults (on).
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
