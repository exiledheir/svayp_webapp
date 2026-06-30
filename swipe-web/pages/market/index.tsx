import React, { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Plus, User, Search, Camera, Heart, MessageCircle } from 'lucide-react';
import MarketFeedCard from '@/components/market/MarketFeedCard';
import { isMarketOnboardingComplete } from '@/lib/market-storage';
import { getFeed as apiGetFeed, type ListingCard } from '@/lib/market-api';
import { MARKET_CATEGORIES, categoryLabel } from '@/lib/market-attributes';
import type { MarketListing } from '@/types/market';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useMarketAccess } from '@/lib/feature-flags-context';
import { useRootBackGuard } from '@/lib/use-root-back-guard';
import MarketComingSoon from '@/components/market/MarketComingSoon';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';
import { openSupportChat } from '@/lib/support-chat';

/**
 * Market feed — the C2C marketplace hub. Layout (top → bottom):
 *   Header (title + My listings) · Search bar · Ad banners · Categories · Grid.
 * Browsing is public; posting routes through the one-time onboarding gate at
 * /market/onboarding.
 */
export default function MarketFeedPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const access = useMarketAccess();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);

  // Root tab page — trap Back so it doesn't exit to a blank WebView screen.
  useRootBackGuard();

  useEffect(() => {
    if (access === 'enabled') logAnalyticsEvent(Events.MARKET_FEED_VIEWED);
  }, [access]);

  const loadFeed = useCallback(async () => {
    if (access !== 'enabled') return;
    // Live backend feed (GET /marketplace/listings).
    try {
      const page = await apiGetFeed({
        category: category ? [category] : undefined,
        q: search.trim() || undefined,
      });
      setListings(page.content.map(cardToListing));
    } catch {
      setListings([]);
    }
  }, [access, category, search]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // ── Pull-to-refresh ─────────────────────────────────────────────────────────
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
      setPullDistance(Math.min(dy * 0.45, PULL_THRESHOLD + 20)); // resist so it doesn't pull 1:1
    } else {
      setPullDistance(0);
    }
  }

  async function handlePullTouchEnd() {
    if (pullDistance >= PULL_THRESHOLD && !isPullRefreshing) {
      setIsPullRefreshing(true);
      setPullDistance(0);
      loadFeed();
      // Feed reads from localStorage (instant) — hold the spinner briefly so the
      // refresh is perceptible.
      await new Promise((r) => setTimeout(r, 450));
      setIsPullRefreshing(false);
    } else {
      setPullDistance(0);
    }
    pullStartYRef.current = null;
  }

  // React's onTouchMove is passive and can't preventDefault, so inside the native
  // WebView the OS overscroll swallows the drag. Claim the gesture with a
  // non-passive listener while pulling at the very top.
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

  // ── Support banner tap → open the Libas support chat ────────────────────────
  // Native chat inside the app, web chat in a browser, Telegram on failure.
  async function handleSupportBannerClick() {
    if (supportLoading) return;
    setSupportLoading(true);
    logAnalyticsEvent(Events.MARKET_SUPPORT_BANNER_TAPPED);
    try {
      await openSupportChat(router);
    } finally {
      setSupportLoading(false);
    }
  }

  // Banner CTAs — sell entry + support contact (each routes somewhere).
  const banners = [
    {
      title: t.mk_banner_sell_title,
      sub: t.mk_banner_sell_sub,
      grad: 'linear-gradient(135deg,#F370A7,#F2994A)',
      img: '/images/market/sell_faster.webp' as string | undefined,
      icon: null as React.ReactNode,
      onClick: handlePost, // → /market/create (via the onboarding gate)
    },
    {
      title: t.mk_banner_contact_title,
      sub: t.mk_banner_contact_sub,
      grad: 'linear-gradient(135deg,#2AABEE,#229ED9)',
      img: undefined as string | undefined,
      icon: <MessageCircle size={30} strokeWidth={2} className="text-white" />,
      onClick: handleSupportBannerClick, // → Libas support chat
    },
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/market/liked')}
              className="w-9 h-9 flex items-center justify-center rounded-full active:opacity-80"
              style={{ border: isDark ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(0,0,0,0.13)' }}
              aria-label={t.mk_liked_title}
            >
              <Heart size={17} strokeWidth={1.9} className="text-black dark:text-white" />
            </button>
            <button
              onClick={() => router.push('/market/mine')}
              className="flex items-center gap-1.5 h-9 pl-3 pr-3.5 rounded-full active:opacity-80"
              style={{ border: isDark ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(0,0,0,0.13)' }}
            >
              <User size={15} strokeWidth={1.9} className="text-black dark:text-white" />
              <span className="text-[13px] font-semibold text-black dark:text-white">{t.mk_my_listings}</span>
            </button>
          </div>
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
          ref={mainScrollRef}
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))', overscrollBehaviorY: 'contain' }}
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

          {/* CTA banners — sell entry + contact support */}
          <div className="hide-scrollbar flex gap-3 overflow-x-auto px-4 pt-1 pb-3" style={{ scrollSnapType: 'x mandatory' }}>
            {banners.map((b, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onClick={b.onClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    b.onClick();
                  }
                }}
                className="relative shrink-0 flex items-stretch gap-2 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform select-none"
                style={{
                  width: 280,
                  height: 124,
                  borderRadius: 20,
                  background: b.grad,
                  scrollSnapAlign: 'start',
                  padding: 16,
                }}
              >
                {/* Text column — flexes to fill the space the image leaves, so it
                    never sits under the image no matter how long the translation. */}
                <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-end">
                  <p className="text-white text-[18px] font-bold leading-tight line-clamp-2">{b.title}</p>
                  <p className="text-white/85 text-[12px] leading-snug mt-0.5 line-clamp-2">{b.sub}</p>
                </div>
                {/* Right column — bleed image (sell) or icon badge (contact). */}
                {b.img ? (
                  <div
                    className="relative shrink-0 w-[108px] -my-4 -mr-4 pointer-events-none select-none"
                    aria-hidden
                  >
                    <Image
                      src={b.img}
                      alt=""
                      fill
                      sizes="108px"
                      unoptimized
                      className="object-contain object-bottom"
                    />
                  </div>
                ) : b.icon ? (
                  <div
                    className="relative shrink-0 flex items-center justify-center pointer-events-none select-none"
                    aria-hidden
                  >
                    <div className="w-[60px] h-[60px] rounded-2xl bg-white/15 flex items-center justify-center">
                      {b.icon}
                    </div>
                  </div>
                ) : null}
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
                label={categoryLabel(cat.key, locale)}
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

/** Adapt the backend feed card projection to the shape MarketFeedCard renders. */
function cardToListing(c: ListingCard): MarketListing {
  return {
    id: c.id,
    title: c.title,
    images: c.coverImage ? [c.coverImage] : [],
    price: c.price,
    currency: c.currency as MarketListing['currency'],
    dealType: c.dealType as MarketListing['dealType'],
    isUrgent: c.isUrgent,
    isFavorite: c.isFavorite,
    location: { region: c.region ?? undefined },
    postedAt: c.postedAt,
  } as MarketListing;
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
