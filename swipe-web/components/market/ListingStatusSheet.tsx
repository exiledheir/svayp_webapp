import React from 'react';
import { Archive, Tag, RotateCcw, type LucideIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import MarketStatusBadge from './MarketStatusBadge';
import type { MarketListing, MarketListingStatus } from '@/types/market';

interface Props {
  listing: MarketListing | null;
  onClose: () => void;
  onSetStatus: (id: string, status: MarketListingStatus) => void;
}

// Seller-controlled lifecycle states. The seller can only switch between these
// AFTER the listing has passed review — a pending ("Under review") or rejected
// listing is owned by moderation, not the seller, so its status is locked here.
const SELLER_STATES: MarketListingStatus[] = ['active', 'sold', 'archived'];

const TARGET_ICON: Record<string, LucideIcon> = {
  active: RotateCcw,
  sold: Tag,
  archived: Archive,
};

/** Bottom-sheet to move a listing between its live statuses (active/sold/archived). */
export default function ListingStatusSheet({ listing, onClose, onSetStatus }: Props) {
  const { t } = useI18n();
  if (!listing) return null;
  const { id, status } = listing;
  // Status is the seller's to change only once the listing is live (past review).
  const canManage = SELLER_STATES.includes(status);
  const transitions = canManage ? SELLER_STATES.filter((s) => s !== status) : [];

  const targetLabel = (s: MarketListingStatus) =>
    s === 'active' ? t.mk_manage_mark_active : s === 'sold' ? t.mk_manage_mark_sold : t.mk_manage_archive;

  return (
    <div
      className="absolute inset-0 z-[80] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="px-5 pt-4 bg-white dark:bg-[#1c1c1e]"
        style={{ borderRadius: '24px 24px 0 0', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mx-auto mb-3" style={{ background: 'rgba(128,128,128,0.4)' }} />

        <div className="flex items-center gap-2 mb-3">
          <h2 className="flex-1 text-[16px] font-bold truncate text-black dark:text-white">{t.mk_manage_status}</h2>
          <MarketStatusBadge status={status} />
        </div>

        {/* Locked while a listing is owned by moderation (under review / rejected). */}
        {!canManage && (
          <p className="text-[13px] leading-relaxed text-black/55 dark:text-white/55 mb-1">
            {status === 'rejected' ? t.mk_rejected_note : t.mk_status_locked_note}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          {transitions.map((s) => {
            const Icon = TARGET_ICON[s];
            return (
              <button
                key={s}
                onClick={() => onSetStatus(id, s)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:opacity-80"
                style={{ background: 'rgba(128,128,128,0.08)' }}
              >
                <Icon size={19} className="text-black/70 dark:text-white/70" strokeWidth={2} />
                <span className="flex-1 text-left text-[15px] font-semibold text-black dark:text-white">
                  {targetLabel(s)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
