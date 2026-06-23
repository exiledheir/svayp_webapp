import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ArrowLeft, Heart } from 'lucide-react';
import MarketFeedCard from '@/components/market/MarketFeedCard';
import MarketGuard from '@/components/market/MarketGuard';
import { getFavoriteListings } from '@/lib/market-storage';
import type { MarketListing } from '@/types/market';
import { useI18n } from '@/lib/i18n';

function LikedListingsPageInner() {
  const router = useRouter();
  const { t } = useI18n();
  const [listings, setListings] = useState<MarketListing[]>([]);

  useEffect(() => {
    setListings(getFavoriteListings());
  }, []);

  // Drop a card from the grid the moment it's un-liked.
  function handleToggle(id: string, next: boolean) {
    if (!next) setListings((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <>
      <Head>
        <title>{t.mk_liked_title}</title>
      </Head>

      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        {/* Header */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-3"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))', borderBottom: '0.5px solid rgba(128,128,128,0.18)' }}
        >
          <button onClick={() => router.push('/market')} aria-label="Back" className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft size={22} className="text-black dark:text-white" />
          </button>
          <h1 className="text-[18px] font-bold text-black dark:text-white">{t.mk_liked_title}</h1>
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-4">
          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Heart size={40} strokeWidth={1.5} className="text-black/20 dark:text-white/20" />
              <p className="text-[14px] text-black/45 dark:text-white/45">{t.mk_liked_empty}</p>
              <button
                onClick={() => router.push('/market')}
                className="px-6 py-3 rounded-2xl text-white font-semibold text-[14px]"
                style={{ background: '#F370A7' }}
              >
                {t.marketTitle}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {listings.map((l) => (
                <MarketFeedCard key={l.id} listing={l} onToggleFavorite={handleToggle} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default function LikedListingsPage() {
  return (
    <MarketGuard>
      <LikedListingsPageInner />
    </MarketGuard>
  );
}
