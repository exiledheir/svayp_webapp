import React from 'react';

/**
 * Лента (Feed) is always available — the feature flag/allowlist gating was
 * removed. This wrapper is now a pass-through, kept so existing pages don't need
 * to change their imports.
 */
export default function FeedGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
