import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getUserProfile } from '@/lib/wardrobe-api';

interface FeatureFlagsState {
  /** Both flags are driven by GET /app/premium-enabled → data.enabled */
  plansEnabled: boolean;
  profileEnabled: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsState>({
  plansEnabled: false,
  profileEnabled: false,
});

// The premium-enabled feature flag only applies to these phone number(s).
// Everyone else always sees subscription/premium features regardless of the
// flag; the flag can only toggle them OFF for the account(s) listed here.
// Compared by digits-only so formatting (+998…, spaces) doesn't matter.
const FLAG_SCOPED_PHONES = ['998909958022'];

function normalizePhone(phone?: string): string {
  return (phone ?? '').replace(/\D/g, '');
}

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  // Default ON: subscription is visible for everyone while the flag/profile
  // load. Only the scoped account below can turn it off (once resolved).
  const [flags, setFlags] = useState<FeatureFlagsState>({ plansEnabled: true, profileEnabled: true });

  useEffect(() => {
    Promise.all([
      api.get<{ data: { enabled: boolean } }>('/app/premium-enabled')
        .then((res) => res.data?.data?.enabled ?? false)
        .catch(() => false),
      getUserProfile()
        .then((profile) => profile.phoneNumber)
        .catch(() => undefined),
    ])
      .then(([backendEnabled, phoneNumber]) => {
        // The flag is scoped to specific account(s): they follow the backend
        // value, while every other user always has premium features on.
        const isScoped = FLAG_SCOPED_PHONES.includes(normalizePhone(phoneNumber));
        const enabled = isScoped ? backendEnabled : true;
        setFlags({ plansEnabled: enabled, profileEnabled: enabled });
      })
      .catch(() => { /* keep defaults (false) on error */ });
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
