import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, FileEdit, Trash2, ChevronRight } from 'lucide-react';
import MarketFeedCard from '@/components/market/MarketFeedCard';
import MarketGuard from '@/components/market/MarketGuard';
import { getDraft, clearDraft } from '@/lib/market-storage';
import { getMyListings as getMyListingsApi, deleteListing as deleteListingApi } from '@/lib/market-api';
import type { MarketListing, MarketDraft } from '@/types/market';
import { useI18n } from '@/lib/i18n';

function MyListingsPageInner() {
  const router = useRouter();
  const { t } = useI18n();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [draft, setDraft] = useState<MarketDraft | null>(null);

  async function reload() {
    setDraft(getDraft()); // wizard drafts stay client-side for the resume UX
    try {
      const page = await getMyListingsApi();
      setListings(page.content as unknown as MarketListing[]);
    } catch {
      setListings([]);
    }
  }

  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function removeDraft() {
    clearDraft();
    reload();
  }

  async function removeListing(id: string) {
    try { await deleteListingApi(id); } catch { /* ignore */ }
    reload();
  }

  const isEmpty = listings.length === 0 && !draft;

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

        <main className="flex-1 overflow-y-auto px-4 py-4">
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
              {/* Draft */}
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

              {/* Under review (new listings await approval — no public feed yet) */}
              {listings.some((l) => l.status === 'pending') && (
                <div className="mb-5">
                  <p className="text-[13px] font-bold text-[#F370A7] uppercase tracking-wide mb-2">{t.mk_status_review}</p>
                  <ListingGrid items={listings.filter((l) => l.status === 'pending')} onDelete={removeListing} deleteLabel={t.mk_mine_delete} />
                </div>
              )}

              {/* Published */}
              {listings.some((l) => l.status !== 'pending') && (
                <>
                  <p className="text-[13px] font-bold text-black/45 dark:text-white/45 uppercase tracking-wide mb-2">{t.mk_mine_published}</p>
                  <ListingGrid items={listings.filter((l) => l.status !== 'pending')} onDelete={removeListing} deleteLabel={t.mk_mine_delete} />
                </>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}

function ListingGrid({ items, onDelete, deleteLabel }: {
  items: MarketListing[];
  onDelete: (id: string) => void;
  deleteLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((l) => (
        <div key={l.id} className="relative">
          <MarketFeedCard listing={l} />
          <button
            onClick={() => onDelete(l.id)}
            className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            aria-label={deleteLabel}
          >
            <Trash2 size={14} color="white" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function MyListingsPage() {
  return (
    <MarketGuard>
      <MyListingsPageInner />
    </MarketGuard>
  );
}
