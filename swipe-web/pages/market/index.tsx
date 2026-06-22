import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { LayoutGrid, ChevronRight, Plus, User } from 'lucide-react';
import { TopBar } from '@/components/BottomNav';
import MarketFeedCard from '@/components/market/MarketFeedCard';
import MarketCategorySheet from '@/components/market/MarketCategorySheet';
import { getFeed, isMarketOnboardingComplete } from '@/lib/market-storage';
import { getCategory } from '@/lib/market-attributes';
import type { MarketListing } from '@/types/market';
import { useI18n } from '@/lib/i18n';
import { useMarketAccess } from '@/lib/feature-flags-context';
import MarketComingSoon from '@/components/market/MarketComingSoon';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';

/**
 * Market feed — the C2C marketplace hub. Replaces the old coming-soon
 * placeholder. Self-contained (no web BottomNav; the native Market tab owns
 * navigation). Browsing is public; posting routes through the one-time
 * onboarding gate at /market/onboarding.
 */
export default function MarketFeedPage() {
  const router = useRouter();
  const { t } = useI18n();
  const access = useMarketAccess();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [showCatSheet, setShowCatSheet] = useState(false);

  useEffect(() => {
    if (access === 'enabled') logAnalyticsEvent(Events.MARKET_FEED_VIEWED);
  }, [access]);

  useEffect(() => {
    if (access !== 'enabled') return;
    const { listings: l } = getFeed({ category: category ?? undefined });
    setListings(l);
  }, [category, access]);

  function handlePost() {
    if (isMarketOnboardingComplete()) router.push('/market/create');
    else router.push('/market/onboarding');
  }

  // ── Feature gate: non-allowlisted users (flag off) see "coming soon" ──
  if (access === 'loading') {
    return <div className="phone-container bg-white dark:bg-[#111111]" style={{ height: '100dvh' }} />;
  }
  if (access === 'blocked') {
    return <MarketComingSoon />;
  }

  const catLabel = category ? getCategory(category)?.label ?? t.mk_categories : t.mk_all_categories;
  const isCatActive = category !== null;

  return (
    <>
      <Head>
        <title>{t.marketTitle}</title>
      </Head>

      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        <TopBar title={t.marketTitle} showCartLiked={false} />

        {/* Filter row */}
        <div className="shrink-0 px-4" style={{ paddingTop: 80, paddingBottom: 12 }}>
          <div className="flex gap-2.5">
            <button
              className="flex-1 h-11 flex items-center gap-1.5 px-3.5"
              style={{
                background: isCatActive ? '#000' : 'white',
                borderRadius: 22,
                border: isCatActive ? '1px solid transparent' : '1px solid rgba(0,0,0,0.13)',
              }}
              onClick={() => setShowCatSheet(true)}
            >
              <LayoutGrid size={15} strokeWidth={1.8} color={isCatActive ? 'white' : '#000'} />
              <span className="flex-1 text-left text-[13px] font-semibold truncate" style={{ color: isCatActive ? 'white' : '#000' }}>
                {catLabel}
              </span>
              <ChevronRight size={16} strokeWidth={1.8} color={isCatActive ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.35)'} />
            </button>

            <button
              className="h-11 flex items-center gap-1.5 px-3.5"
              style={{ background: 'white', borderRadius: 22, border: '1px solid rgba(0,0,0,0.13)' }}
              onClick={() => router.push('/market/mine')}
              aria-label={t.mk_my_listings}
            >
              <User size={16} strokeWidth={1.8} color="#000" />
            </button>
          </div>
        </div>

        {/* Grid */}
        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>
          {listings.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-[13px]" style={{ color: 'rgba(128,128,128,0.7)' }}>
              {t.mk_empty_feed}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4">
              {listings.map((l) => (
                <MarketFeedCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </main>

        {/* Post-listing FAB */}
        <button
          onClick={handlePost}
          className="absolute z-50 flex items-center gap-2 px-5 h-14 rounded-full text-white font-semibold text-[15px] active:opacity-90"
          style={{
            right: 20,
            bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            background: '#F370A7',
            boxShadow: '0 10px 30px rgba(243,112,167,0.5)',
          }}
        >
          <Plus size={20} strokeWidth={2.5} />
          {t.mk_sell_short}
        </button>

        <MarketCategorySheet
          open={showCatSheet}
          value={category}
          onSelect={setCategory}
          onClose={() => setShowCatSheet(false)}
          includeAll
        />
      </div>
    </>
  );
}
