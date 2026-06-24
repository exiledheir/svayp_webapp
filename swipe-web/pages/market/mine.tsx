import React, { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, FileEdit, Trash2, ChevronRight, Pencil, SlidersHorizontal } from 'lucide-react';
import MarketFeedCard from '@/components/market/MarketFeedCard';
import MarketStatusBadge from '@/components/market/MarketStatusBadge';
import ListingStatusSheet from '@/components/market/ListingStatusSheet';
import MarketGuard from '@/components/market/MarketGuard';
import {
  getMyListings, getDraft, clearDraft, deleteListing, setListingStatus,
} from '@/lib/market-storage';
import type { MarketListing, MarketDraft, MarketListingStatus } from '@/types/market';
import { statusLabel } from '@/lib/market-attributes';
import { useI18n } from '@/lib/i18n';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';

// Sort order so listings that need attention surface first.
const STATUS_RANK: Record<MarketListingStatus, number> = {
  pending: 0, rejected: 1, active: 2, sold: 3, archived: 4, draft: 5,
};

function MyListingsPageInner() {
  const router = useRouter();
  const { t } = useI18n();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [draft, setDraft] = useState<MarketDraft | null>(null);
  const [statusTarget, setStatusTarget] = useState<MarketListing | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<{ listing: MarketListing; target: MarketListingStatus } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MarketListing | null>(null);

  const reload = useCallback(() => {
    setListings(getMyListings());
    setDraft(getDraft());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  function removeDraft() {
    clearDraft();
    reload();
  }

  function doDelete(id: string) {
    deleteListing(id);
    setConfirmDelete(null);
    reload();
  }

  // Picking a status in the sheet asks for confirmation first (like delete).
  function requestStatusChange(listing: MarketListing, target: MarketListingStatus) {
    setStatusTarget(null);
    setConfirmStatus({ listing, target });
  }

  function applyStatusChange() {
    if (!confirmStatus) return;
    const { listing, target } = confirmStatus;
    setListingStatus(listing.id, target);
    logAnalyticsEvent(Events.MARKET_LISTING_STATUS_CHANGED, { listing_id: listing.id, status: target });
    setConfirmStatus(null);
    reload();
  }

  function editListing(id: string) {
    router.push(`/market/create?edit=${encodeURIComponent(id)}`);
  }

  // ── Pull-to-refresh (mirrors the market feed) ───────────────────────────────
  const mainScrollRef = useRef<HTMLElement>(null);
  const pullStartYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const PULL_THRESHOLD = 72;

  function handlePullTouchStart(e: React.TouchEvent<HTMLElement>) {
    if (mainScrollRef.current && mainScrollRef.current.scrollTop === 0) {
      pullStartYRef.current = e.touches[0].clientY;
    }
  }

  function handlePullTouchMove(e: React.TouchEvent<HTMLElement>) {
    if (pullStartYRef.current === null || isPullRefreshing) return;
    const dy = e.touches[0].clientY - pullStartYRef.current;
    if (dy > 0 && mainScrollRef.current && mainScrollRef.current.scrollTop === 0) {
      setPullDistance(Math.min(dy * 0.45, PULL_THRESHOLD + 20));
    } else {
      setPullDistance(0);
    }
  }

  async function handlePullTouchEnd() {
    if (pullDistance >= PULL_THRESHOLD && !isPullRefreshing) {
      setIsPullRefreshing(true);
      setPullDistance(0);
      reload();
      await new Promise((r) => setTimeout(r, 450)); // perceptible spinner; reads are instant
      setIsPullRefreshing(false);
    } else {
      setPullDistance(0);
    }
    pullStartYRef.current = null;
  }

  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (pullStartYRef.current === null || el.scrollTop > 0) return;
      const dy = e.touches[0].clientY - pullStartYRef.current;
      if (dy > 0) e.preventDefault();
    };
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => el.removeEventListener('touchmove', onMove);
  }, []);

  const isEmpty = listings.length === 0 && !draft;
  const sorted = [...listings].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);

  return (
    <>
      <Head>
        <title>{t.mk_mine_title}</title>
      </Head>

      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        {/* Header */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))', borderBottom: '0.5px solid rgba(128,128,128,0.18)' }}>
          <button onClick={() => router.push('/market')} aria-label="Back" className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft size={22} className="text-black dark:text-white" />
          </button>
          <h1 className="text-[18px] font-bold text-black dark:text-white">{t.mk_mine_title}</h1>
        </div>

        <main
          ref={mainScrollRef}
          className="flex-1 overflow-y-auto px-4 py-4"
          style={{ overscrollBehaviorY: 'contain' }}
          onTouchStart={handlePullTouchStart}
          onTouchMove={handlePullTouchMove}
          onTouchEnd={handlePullTouchEnd}
        >
          {/* Pull-to-refresh indicator */}
          <div
            className="flex items-center justify-center overflow-hidden transition-all duration-200"
            style={{ height: isPullRefreshing ? 44 : pullDistance > 0 ? Math.min(pullDistance, 44) : 0 }}
          >
            <div
              className="w-7 h-7 rounded-full border-2"
              style={{
                borderColor: '#F370A7',
                borderTopColor: 'transparent',
                animation: isPullRefreshing ? 'spin 0.7s linear infinite' : 'none',
                transform: isPullRefreshing ? undefined : `rotate(${Math.min((pullDistance / PULL_THRESHOLD) * 270, 270)}deg)`,
                opacity: isPullRefreshing ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1),
              }}
            />
          </div>

          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-[14px] text-black/45 dark:text-white/45">{t.mk_mine_empty}</p>
              <button
                onClick={() => router.push('/market/onboarding')}
                className="px-6 py-3 rounded-2xl text-white font-semibold text-[14px]"
                style={{ background: '#F370A7' }}
              >
                {t.mk_post_cta}
              </button>
            </div>
          ) : (
            <>
              {/* Draft (work-in-progress, not yet a listing) */}
              {draft && (
                <div className="mb-5">
                  <p className="text-[13px] font-bold text-black/45 dark:text-white/45 uppercase tracking-wide mb-2">{t.mk_mine_drafts}</p>
                  <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ border: '1px solid rgba(243,112,167,0.4)' }}>
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ background: '#F7F7F8' }}>
                      {draft.images?.[0] ? (
                        <Image src={draft.images[0]} alt="draft" fill sizes="56px" className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileEdit size={20} className="text-black/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1" style={{ background: 'rgba(243,112,167,0.15)', color: '#F370A7' }}>
                        {t.mk_draft_label}
                      </span>
                      <p className="text-[14px] font-semibold truncate text-black dark:text-white">
                        {draft.title || t.mk_title_placeholder}
                      </p>
                    </div>
                    <button onClick={removeDraft} aria-label={t.mk_mine_delete} className="w-9 h-9 flex items-center justify-center">
                      <Trash2 size={18} className="text-black/40 dark:text-white/40" />
                    </button>
                    <button onClick={() => router.push('/market/create')} aria-label={t.mk_mine_continue} className="w-9 h-9 flex items-center justify-center">
                      <ChevronRight size={20} className="text-[#F370A7]" />
                    </button>
                  </div>
                </div>
              )}

              {/* Listings grid — each card: trash (left) + edit (right) overlay,
                  status badge, and a separate Manage button below for status. */}
              <div className="grid grid-cols-2 gap-3">
                {sorted.map((l) => (
                  <div key={l.id}>
                    <MarketFeedCard
                      listing={l}
                      hideFavorite
                      overlay={
                        <>
                          {/* Delete — top-left */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(l); }}
                            className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.55)' }}
                            aria-label={t.mk_mine_delete}
                          >
                            <Trash2 size={14} color="white" />
                          </button>
                          {/* Edit — top-right */}
                          <button
                            onClick={(e) => { e.stopPropagation(); editListing(l.id); }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.55)' }}
                            aria-label={t.mk_manage_edit}
                          >
                            <Pencil size={13} color="white" />
                          </button>
                          {/* Status — bottom-left indicator (not interactive) */}
                          <span className="absolute bottom-2 left-2">
                            <MarketStatusBadge status={l.status} />
                          </span>
                        </>
                      }
                    />
                    {/* Manage button — opens the status sheet */}
                    <button
                      onClick={() => setStatusTarget(l)}
                      className="mt-1.5 w-full flex items-center justify-center gap-1.5 h-8 rounded-xl text-[12px] font-semibold text-black/70 dark:text-white/70 active:opacity-70"
                      style={{ background: 'rgba(128,128,128,0.10)' }}
                    >
                      <SlidersHorizontal size={13} strokeWidth={2.2} />
                      {t.mk_manage_title}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>

        {/* Change-status sheet → routes through a confirmation */}
        <ListingStatusSheet
          listing={statusTarget}
          onClose={() => setStatusTarget(null)}
          onSetStatus={(_id, target) => { if (statusTarget) requestStatusChange(statusTarget, target); }}
        />

        {/* Status-change confirmation (mirrors the delete confirmation) */}
        {confirmStatus && (
          <div
            className="absolute inset-0 z-[90] flex items-center justify-center px-8"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setConfirmStatus(null)}
          >
            <div
              className="w-full max-w-[320px] rounded-3xl bg-white dark:bg-[#1c1c1e] p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'rgba(243,112,167,0.12)' }}>
                <SlidersHorizontal size={24} className="text-[#F370A7]" />
              </div>
              <h2 className="text-[18px] font-bold text-black dark:text-white">{t.mk_status_confirm_title}</h2>
              <p className="text-[14px] leading-relaxed text-black/55 dark:text-white/55 mt-1.5">
                {t.mk_status_confirm_body.replace('{status}', statusLabel(t, confirmStatus.target))}
              </p>
              <div className="flex gap-2.5 mt-5">
                <button
                  onClick={() => setConfirmStatus(null)}
                  className="flex-1 py-3 rounded-2xl font-semibold text-[15px] text-black dark:text-white active:opacity-80"
                  style={{ background: 'rgba(128,128,128,0.14)' }}
                >
                  {t.mk_cancel}
                </button>
                <button
                  onClick={applyStatusChange}
                  className="flex-1 py-3 rounded-2xl font-semibold text-[15px] text-white active:opacity-90"
                  style={{ background: '#F370A7' }}
                >
                  {t.confirmBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div
            className="absolute inset-0 z-[90] flex items-center justify-center px-8"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setConfirmDelete(null)}
          >
            <div
              className="w-full max-w-[320px] rounded-3xl bg-white dark:bg-[#1c1c1e] p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}>
                <Trash2 size={26} className="text-[#EF4444]" />
              </div>
              <h2 className="text-[18px] font-bold text-black dark:text-white">{t.mk_delete_confirm_title}</h2>
              <p className="text-[14px] leading-relaxed text-black/55 dark:text-white/55 mt-1.5">{t.mk_delete_confirm_body}</p>
              <div className="flex gap-2.5 mt-5">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 rounded-2xl font-semibold text-[15px] text-black dark:text-white active:opacity-80"
                  style={{ background: 'rgba(128,128,128,0.14)' }}
                >
                  {t.mk_cancel}
                </button>
                <button
                  onClick={() => doDelete(confirmDelete.id)}
                  className="flex-1 py-3 rounded-2xl font-semibold text-[15px] text-white active:opacity-90"
                  style={{ background: '#EF4444' }}
                >
                  {t.mk_mine_delete}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function MyListingsPage() {
  return (
    <MarketGuard>
      <MyListingsPageInner />
    </MarketGuard>
  );
}
