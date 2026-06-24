import React from 'react';
import { useI18n } from '@/lib/i18n';
import { statusLabel } from '@/lib/market-attributes';
import type { MarketListingStatus } from '@/types/market';

// Background / foreground per status — soft tint behind a saturated label.
const COLORS: Record<MarketListingStatus, { bg: string; fg: string }> = {
  draft: { bg: 'rgba(243,112,167,0.15)', fg: '#F370A7' },
  pending: { bg: 'rgba(245,158,11,0.16)', fg: '#D97706' },
  active: { bg: 'rgba(59,165,93,0.16)', fg: '#3BA55D' },
  sold: { bg: 'rgba(107,114,128,0.18)', fg: '#6B7280' },
  archived: { bg: 'rgba(100,116,139,0.18)', fg: '#64748B' },
  rejected: { bg: 'rgba(239,68,68,0.15)', fg: '#EF4444' },
};

/** Small color-coded pill showing a listing's lifecycle status. */
export default function MarketStatusBadge({ status }: { status: MarketListingStatus }) {
  const { t } = useI18n();
  const c = COLORS[status];
  return (
    <span
      className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.fg }}
    >
      {statusLabel(t, status)}
    </span>
  );
}
