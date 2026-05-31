import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface FeatureFlagsState {
  /** Both flags are driven by GET /app/premium-enabled → data.enabled */
  plansEnabled: boolean;
  profileEnabled: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsState>({
  plansEnabled: false,
  profileEnabled: false,
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlagsState>({ plansEnabled: false, profileEnabled: false });

  useEffect(() => {
    api.get<{ data: { enabled: boolean } }>('/app/premium-enabled')
      .then((res) => {
        const enabled = res.data?.data?.enabled ?? false;
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
