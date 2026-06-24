import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, FileEdit, Trash2, ChevronRight, CheckCircle2 } from 'lucide-react';
import MarketFeedCard from '@/components/market/MarketFeedCard';
import MarketGuard from '@/components/market/MarketGuard';
import { getDraft, clearDraft } from '@/lib/market-storage';
import {
  getMyListings as getMyListingsApi, deleteListing as deleteListingApi,
  markSold as markSoldApi, type MineListing,
} from '@/lib/market-api';
import type { MarketDraft } from '@/types/market';
import { useI18n } from '@/lib/i18n';

const REJECT_REASON_RU: Record<string, string> = {
  PROHIBITED_ITEM: 'Запрещённый товар',
  BAD_PHOTOS: 'Плохие фото',
  WRONG_CATEGORY: 'Неверная категория',
  SPAM: 'Спам',
  OTHER: 'Другое',
};

function MyListingsPageInner() {
  const router = useRouter();
  const { t } = useI18n();
  const [listings, setListings] = useState<MineListing[]>([]);
  const [draft, setDraft] = useState<MarketDraft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    setDraft(getDraft()); // wizard drafts stay client-side for the resume UX
    try {
      const page = await getMyListingsApi();
      setListings(page.content);
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
    setBusyId(id);
    try { await deleteListingApi(id); } catch { /* ignore */ }
    setBusyId(null);
    reload();
  }

  async function markSold(id: string) {
    setBusyId(id);
    try { await markSoldApi(id); } catch { /* ignore */ }
    setBusyId(null);
    reload();
  }

  const byStatus = (s: MineListing['status']) => listings.filter((l) => l.status === s);
  const pending = byStatus('pending');
  const rejected = byStatus('rejected');
  const active = byStatus('active');
  const sold = byStatus('sold');
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
                <Section title={t.mk_mine_drafts}>
                  <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ border: '1px solid rgba(243,112,167,0.4)' }}>
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ background: '#F7F7F8' }}>
                      {draft.images?.[0] ? (
                        <Image src={draft.images[0]} alt="draft" fill sizes="56px" className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><FileEdit size={20} className="text-black/30" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1" style={{ background: 'rgba(243,112,167,0.15)', color: '#F370A7' }}>
                        {t.mk_draft_label}
                      </span>
                      <p className="text-[14px] font-semibold truncate text-black dark:text-white">{draft.title || t.mk_title_placeholder}</p>
                    </div>
                    <button onClick={removeDraft} aria-label={t.mk_mine_delete} className="w-9 h-9 flex items-center justify-center">
                      <Trash2 size={18} className="text-black/40 dark:text-white/40" />
                    </button>
                    <button onClick={() => router.push('/market/create')} aria-label={t.mk_mine_continue} className="w-9 h-9 flex items-center justify-center">
                      <ChevronRight size={20} className="text-[#F370A7]" />
                    </button>
                  </div>
                </Section>
              )}

              {/* Rejected — visible reason for the seller */}
              {rejected.length > 0 && (
                <Section title="Отклонены" accent="#E23B3B">
                  <div className="grid grid-cols-2 gap-3">
                    {rejected.map((l) => (
                      <MineCard key={l.id} listing={l} busy={busyId === l.id} onDelete={removeListing}>
                        <div className="mt-1.5 p-2 rounded-xl" style={{ background: 'rgba(226,59,59,0.10)' }}>
                          <p className="text-[11px] font-bold text-[#E23B3B]">
                            {l.moderation?.rejectionReason ? (REJECT_REASON_RU[l.moderation.rejectionReason] ?? l.moderation.rejectionReason) : 'Отклонено'}
                          </p>
                          {l.moderation?.rejectionMessage && (
                            <p className="text-[11px] text-black/60 dark:text-white/60 mt-0.5 leading-snug">{l.moderation.rejectionMessage}</p>
                          )}
                        </div>
                      </MineCard>
                    ))}
                  </div>
                </Section>
              )}

              {/* Under review */}
              {pending.length > 0 && (
                <Section title={t.mk_status_review} accent="#F370A7">
                  <Grid items={pending} busyId={busyId} onDelete={removeListing} />
                </Section>
              )}

              {/* Published — with "mark sold" action */}
              {active.length > 0 && (
                <Section title={t.mk_mine_published}>
                  <div className="grid grid-cols-2 gap-3">
                    {active.map((l) => (
                      <MineCard key={l.id} listing={l} busy={busyId === l.id} onDelete={removeListing}>
                        <button
                          onClick={() => markSold(l.id)}
                          disabled={busyId === l.id}
                          className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold text-white disabled:opacity-50"
                          style={{ background: '#3BA55D' }}
                        >
                          <CheckCircle2 size={14} /> Продано
                        </button>
                      </MineCard>
                    ))}
                  </div>
                </Section>
              )}

              {/* Sold — out of the feed, marked sold out */}
              {sold.length > 0 && (
                <Section title="Продано">
                  <div className="grid grid-cols-2 gap-3">
                    {sold.map((l) => (
                      <MineCard key={l.id} listing={l} busy={busyId === l.id} onDelete={removeListing} dim soldBadge />
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}

function Section({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[13px] font-bold uppercase tracking-wide mb-2" style={{ color: accent ?? 'rgba(128,128,128,0.7)' }}>{title}</p>
      {children}
    </div>
  );
}

function Grid({ items, busyId, onDelete }: { items: MineListing[]; busyId: string | null; onDelete: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((l) => <MineCard key={l.id} listing={l} busy={busyId === l.id} onDelete={onDelete} />)}
    </div>
  );
}

function MineCard({
  listing, busy, onDelete, children, dim, soldBadge,
}: {
  listing: MineListing;
  busy: boolean;
  onDelete: (id: string) => void;
  children?: React.ReactNode;
  dim?: boolean;
  soldBadge?: boolean;
}) {
  return (
    <div className="relative">
      <div style={dim ? { opacity: 0.55 } : undefined}>
        <MarketFeedCard listing={listing} />
      </div>
      {soldBadge && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
          <span className="px-3 py-1 rounded-full text-white text-[12px] font-bold" style={{ background: 'rgba(0,0,0,0.7)' }}>
            Продано
          </span>
        </div>
      )}
      <button
        onClick={() => onDelete(listing.id)}
        disabled={busy}
        className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-50"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        aria-label="delete"
      >
        <Trash2 size={14} color="white" />
      </button>
      {children}
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
