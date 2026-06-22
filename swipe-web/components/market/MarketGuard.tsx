import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useMarketAccess } from '@/lib/feature-flags-context';

/**
 * Wraps a Market sub-page (create / detail / mine / chat / onboarding). Renders
 * the page only when the user has Market access; while resolving it shows a
 * blank container, and blocked users are redirected to /market (which shows the
 * "coming soon" placeholder). Because children only mount when enabled, the
 * wrapped page's own hooks never run for blocked users.
 */
export default function MarketGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const access = useMarketAccess();

  useEffect(() => {
    if (access === 'blocked') router.replace('/market');
  }, [access, router]);

  if (access !== 'enabled') {
    return <div className="phone-container bg-white dark:bg-[#111111]" style={{ height: '100dvh' }} />;
  }
  return <>{children}</>;
}
