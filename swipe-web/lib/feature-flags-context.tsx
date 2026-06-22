import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSubscriptionBadgeEnabled } from '@/lib/api';
import { getUserProfile } from '@/lib/wardrobe-api';

interface FeatureFlagsState {
  /** Both flags are driven by the FRONTEND-only `feature.subscription_badge.enabled`
   *  flag — but only for the scoped account(s) below. */
  plansEnabled: boolean;
  profileEnabled: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsState>({
  plansEnabled: true,
  profileEnabled: true,
});

// `feature.subscription_badge.enabled` only applies to these phone number(s).
// Everyone else always sees the subscription badge / premium UI regardless of
// the flag; the flag can only toggle it for the account(s) listed here, so it
// can never affect any other user. Compared by digits-only so formatting
// (+998…, spaces) doesn't matter.
const FLAG_SCOPED_PHONES = ['998909958022'];

function normalizePhone(phone?: string): string {
  return (phone ?? '').replace(/\D/g, '');
}

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  // Default ON: subscription is visible for everyone while the flag/profile
  // load. Only the scoped account below can toggle it (once resolved).
  const [flags, setFlags] = useState<FeatureFlagsState>({ plansEnabled: true, profileEnabled: true });

  useEffect(() => {
    Promise.all([
      getSubscriptionBadgeEnabled(),
      getUserProfile()
        .then((profile) => profile.phoneNumber)
        .catch(() => undefined),
    ])
      .then(([badgeEnabled, phoneNumber]) => {
        // Scoped to specific account(s): they follow the flag value, while every
        // other user always has the subscription badge / premium UI on.
        const isScoped = FLAG_SCOPED_PHONES.includes(normalizePhone(phoneNumber));
        const enabled = isScoped ? badgeEnabled : true;
        setFlags({ plansEnabled: enabled, profileEnabled: enabled });
      })
      .catch(() => { /* keep defaults (on) on error */ });
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
