import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Plus, User, Search, Camera } from 'lucide-react';
import MarketFeedCard from '@/components/market/MarketFeedCard';
import { getFeed, isMarketOnboardingComplete } from '@/lib/market-storage';
import { MARKET_CATEGORIES } from '@/lib/market-attributes';
import type { MarketListing } from '@/types/market';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useMarketAccess } from '@/lib/feature-flags-context';
import MarketComingSoon from '@/components/market/MarketComingSoon';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';

/**
 * Market feed — the C2C marketplace hub. Layout (top → bottom):
 *   Header (title + My listings) · Search bar · Ad banners · Categories · Grid.
 * Browsing is public; posting routes through the one-time onboarding gate at
 * /market/onboarding.
 */
export default function MarketFeedPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const access = useMarketAccess();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (access === 'enabled') logAnalyticsEvent(Events.MARKET_FEED_VIEWED);
  }, [access]);

  useEffect(() => {
    if (access !== 'enabled') return;
    const { listings: l } = getFeed({
      category: category ?? undefined,
      search: search.trim() || undefined,
    });
    setListings(l);
  }, [category, search, access]);

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

  // Ad banner slots — gradient promo cards (placeholder ad inventory).
  const banners = [
    { title: t.mk_banner_sell_title, sub: t.mk_banner_sell_sub, grad: 'linear-gradient(135deg,#F370A7,#F2994A)' },
    { title: t.mk_banner_new_title, sub: t.mk_banner_new_sub, grad: 'linear-gradient(135deg,#5B8CFF,#8E5BD6)' },
    { title: t.mk_banner_local_title, sub: t.mk_banner_local_sub, grad: 'linear-gradient(135deg,#3BA55D,#7FB8E8)' },
  ];

  return (
    <>
      <Head>
        <title>{t.marketTitle}</title>
      </Head>

      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        {/* ── Header: title + My listings (one line) ── */}
        <header
          className="shrink-0 flex items-center justify-between px-4 pb-2"
          style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
        >
          <h1 className="text-[26px] font-bold tracking-[-0.5px] text-black dark:text-white">
            {t.marketTitle}
          </h1>
          <button
            onClick={() => router.push('/market/mine')}
            className="flex items-center gap-1.5 h-9 pl-3 pr-3.5 rounded-full active:opacity-80"
            style={{ border: isDark ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(0,0,0,0.13)' }}
          >
            <User size={15} strokeWidth={1.9} className="text-black dark:text-white" />
            <span className="text-[13px] font-semibold text-black dark:text-white">{t.mk_my_listings}</span>
          </button>
        </header>

        {/* ── Search bar + visual search ── */}
        <div className="shrink-0 px-4 pt-1 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className="flex-1 flex items-center gap-2 h-11 px-3.5 rounded-full"
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
            >
              <Search size={17} strokeWidth={1.9} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.mk_search_placeholder}
                className="flex-1 min-w-0 bg-transparent text-[14px] text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 outline-none"
              />
            </div>
            <button
              aria-label={t.mk_visual_search}
              className="shrink-0 w-11 h-11 flex items-center justify-center vs-pulse active:opacity-90"
              style={{
                borderRadius: 14,
                background: 'linear-gradient(135deg, #f093fb 0%, #F5576c 100%)',
              }}
            >
              <Camera size={19} strokeWidth={2} color="#fff" />
            </button>
          </div>
        </div>

        {/* ── Scrollable content: banners · categories · grid ── */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Advertisement banners */}
          <div className="hide-scrollbar flex gap-3 overflow-x-auto px-4 pt-1 pb-3" style={{ scrollSnapType: 'x mandatory' }}>
            {banners.map((b, i) => (
              <div
                key={i}
                className="relative shrink-0 flex flex-col justify-end overflow-hidden"
                style={{
                  width: 280,
                  height: 124,
                  borderRadius: 20,
                  background: b.grad,
                  scrollSnapAlign: 'start',
                  padding: 16,
                }}
              >
                <span
                  className="absolute top-2.5 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.22)', color: '#fff' }}
                >
                  {t.mk_ad_label}
                </span>
                <span className="text-white text-[18px] font-bold leading-tight">{b.title}</span>
                <span className="text-white/85 text-[12px] mt-0.5">{b.sub}</span>
              </div>
            ))}
          </div>

          {/* Categories — horizontal scroll */}
          <div className="hide-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
            <CategoryChip
              label={t.mk_all_categories}
              active={category === null}
              isDark={isDark}
              onClick={() => setCategory(null)}
            />
            {MARKET_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat.key}
                label={cat.label}
                active={category === cat.key}
                isDark={isDark}
                onClick={() => setCategory(cat.key)}
              />
            ))}
          </div>

          {/* Listings grid */}
          {listings.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-[13px]" style={{ color: 'rgba(128,128,128,0.7)' }}>
              {t.mk_empty_feed}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 px-4 pt-1">
              {listings.map((l) => (
                <MarketFeedCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </main>

        {/* Post-listing FAB */}
        <button
          onClick={handlePost}
          className="absolute z-50 flex items-center gap-1.5 px-4 h-12 rounded-full text-white font-semibold text-[14px] active:opacity-90"
          style={{
            right: 16,
            bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            background: '#F370A7',
            boxShadow: '0 8px 22px rgba(243,112,167,0.45)',
          }}
        >
          <Plus size={18} strokeWidth={2.6} />
          {t.mk_sell_short}
        </button>
      </div>
    </>
  );
}

function CategoryChip({
  label,
  active,
  isDark,
  onClick,
}: {
  label: string;
  active: boolean;
  isDark: boolean;
  onClick: () => void;
}) {
  const activeBg = isDark ? '#fff' : '#000';
  const activeText = isDark ? '#000' : '#fff';
  const idleText = isDark ? '#fff' : '#000';
  const idleBorder = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.13)';
  return (
    <button
      onClick={onClick}
      className="shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap active:opacity-80"
      style={{
        background: active ? activeBg : 'transparent',
        color: active ? activeText : idleText,
        border: active ? '1px solid transparent' : `1px solid ${idleBorder}`,
      }}
    >
      {label}
    </button>
  );
}
