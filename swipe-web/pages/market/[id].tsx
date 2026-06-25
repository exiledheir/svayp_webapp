import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, Heart, MapPin, User } from 'lucide-react';
import type { MarketListing } from '@/types/market';
import { getListing, addFavorite, removeFavorite } from '@/lib/market-api';
import {
  conditionLabel, seasonLabel, lengthLabel, colorLabel, materialLabel, countryLabel, getCategory, categoryLabel,
  brandLabel, sizeLabel, regionLabel,
} from '@/lib/market-attributes';
import { districtLabel } from '@/lib/market-districts';
import { taxLabel } from '@/lib/wardrobe-taxonomy';
import ListingContactBar from '@/components/market/ListingContactBar';
import CarouselDots from '@/components/market/CarouselDots';
import MarketGuard from '@/components/market/MarketGuard';
import { formatPrice } from '@/lib/cart-storage';
import { useI18n } from '@/lib/i18n';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';

function ListingDetailPageInner() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { id } = router.query;
  const [listing, setListing] = useState<MarketListing | null>(null);
  const [liked, setLiked] = useState(false);
  const [ready, setReady] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (typeof id !== 'string') return;
    let cancelled = false;
    getListing(id)
      .then((l) => {
        if (cancelled) return;
        setListing(l);
        setLiked(!!l.isFavorite);
        setReady(true);
        logAnalyticsEvent(Events.MARKET_LISTING_VIEWED, { listing_id: l.id, category: l.category });
      })
      .catch(() => {
        if (!cancelled) { setListing(null); setReady(true); }
      });
    return () => { cancelled = true; };
  }, [id]);

  if (ready && !listing) {
    return (
      <div className="phone-container flex flex-col items-center justify-center bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        <p className="text-[14px] text-black/50 dark:text-white/50 mb-4">{t.mk_empty_feed}</p>
        <button onClick={() => router.replace('/market')} className="text-[14px] font-semibold text-[#F370A7]">
          {t.mk_published_back}
        </button>
      </div>
    );
  }

  if (!listing) {
    return <div className="phone-container bg-white dark:bg-[#111111]" style={{ height: '100dvh' }} />;
  }

  const priceText = listing.dealType === 'free'
    ? t.mk_free
    : formatPrice(listing.price, listing.currency === 'USD' ? 'USD' : t.mk_currency_uzs);
  const category = getCategory(listing.category);

  const rows: Array<{ label: string; value: string }> = [];
  rows.push({ label: t.mk_char_condition, value: conditionLabel(t, listing.condition) });
  if (listing.hijabFriendly != null) rows.push({ label: t.mk_char_modesty, value: listing.hijabFriendly ? t.mk_char_yes : t.mk_char_no });
  if (category) rows.push({ label: t.mk_categories, value: categoryLabel(listing.category, locale) });
  if (listing.brand) rows.push({ label: t.mk_char_brand, value: brandLabel(listing.brand, t) });
  if (listing.size) rows.push({ label: t.mk_char_size, value: sizeLabel(listing.size, t) });
  if (listing.fit) rows.push({ label: t.mk_char_fit, value: taxLabel(listing.fit, locale) });
  if (listing.color) rows.push({ label: t.mk_char_color, value: colorLabel(t, listing.color) });
  if (listing.season) rows.push({ label: t.mk_char_season, value: seasonLabel(t, listing.season) });
  if (listing.length) rows.push({ label: t.mk_char_length, value: lengthLabel(t, listing.length) });
  if (listing.material) rows.push({ label: t.mk_char_material, value: materialLabel(listing.material, locale) });
  if (listing.country) rows.push({ label: t.mk_char_country, value: countryLabel(listing.country, locale) });

  async function handleLike() {
    if (!listing) return;
    const next = !liked;
    setLiked(next); // optimistic
    try {
      if (next) await addFavorite(listing.id);
      else await removeFavorite(listing.id);
    } catch {
      setLiked(!next); // revert on failure
    }
  }

  // Always return to the market feed. We can't rely on router.back() here:
  // inside the native app's WebView the initial about:blank→url load inflates
  // window.history.length, so a history-based guard mis-fires and router.back()
  // steps to a blank history entry instead of the feed — the back button then
  // appears to do nothing. The feed is the natural parent of a listing, so we
  // navigate there directly (matching the back buttons on /market/mine and
  // /market/liked, which work reliably).
  function handleBack() {
    router.push('/market');
  }

  const loc = listing.location;
  // New listings store region + district; older ones may have a free-text address.
  const regionText = loc.region ? regionLabel(loc.region, locale) : (loc.address ?? '');
  const districtText = districtLabel(loc.region, loc.district, locale);
  const locationText = [regionText, districtText].filter(Boolean).join(', ');

  return (
    <>
      <Head>
        <title>{listing.title}</title>
      </Head>

      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-3 pt-3 pointer-events-none">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full flex items-center justify-center pointer-events-auto"
            style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
            aria-label="Back"
          >
            <ArrowLeft size={20} color="#000" />
          </button>
          <button
            onClick={handleLike}
            className="w-10 h-10 rounded-full flex items-center justify-center pointer-events-auto"
            style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
            aria-label="Like"
          >
            <Heart size={20} fill={liked ? '#000' : 'none'} color="#000" />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
          {/* Image carousel */}
          <div className="relative">
            <div
              className="flex overflow-x-auto hide-scrollbar"
              style={{ scrollSnapType: 'x mandatory' }}
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.clientWidth) setImgIdx(Math.round(el.scrollLeft / el.clientWidth));
              }}
            >
              {(listing.images.length ? listing.images : ['']).map((src, i) => (
                <div key={i} className="relative shrink-0 w-full" style={{ aspectRatio: '4/5', background: '#F7F7F8', scrollSnapAlign: 'start' }}>
                  {src && <Image src={src} alt={`${listing.title} ${i + 1}`} fill sizes="430px" className="object-cover" unoptimized />}
                </div>
              ))}
            </div>
            <CarouselDots count={listing.images.length} active={imgIdx} />
          </div>

          {/* Price + title */}
          <div className="px-4 pt-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[26px] font-extrabold leading-none text-black dark:text-white">{priceText}</span>
              {listing.isUrgent && (
                <span className="text-white text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: '#F370A7' }}>
                  ⚡ {t.mk_negotiable}
                </span>
              )}
            </div>
            <h1 className="text-[19px] font-bold mt-2 text-black dark:text-white">{listing.title}</h1>
          </div>

          {/* Characteristics */}
          <div className="px-4 pt-5">
            <h2 className="text-[15px] font-bold mb-2 text-black dark:text-white">{t.mk_detail_characteristics}</h2>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(128,128,128,0.15)' }}>
              {rows.map((r, i) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between px-3.5 py-3 text-[14px]"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(128,128,128,0.12)' }}
                >
                  <span className="text-black/50 dark:text-white/50">{r.label}</span>
                  <span className="font-semibold text-right text-black dark:text-white">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="px-4 pt-5">
              <h2 className="text-[15px] font-bold mb-2 text-black dark:text-white">{t.mk_detail_description}</h2>
              <p className="text-[14px] leading-relaxed whitespace-pre-line text-black/80 dark:text-white/80">
                {listing.description}
              </p>
            </div>
          )}

          {/* Seller */}
          <div className="px-4 pt-5">
            <h2 className="text-[15px] font-bold mb-2 text-black dark:text-white">{t.mk_detail_seller}</h2>
            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(128,128,128,0.07)' }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#F370A7' }}>
                <User size={20} color="white" />
              </div>
              <span className="text-[15px] font-semibold text-black dark:text-white">{listing.seller.name}</span>
            </div>
          </div>

          {/* Location — region + district */}
          {locationText && (
            <div className="px-4 pt-5">
              <h2 className="text-[15px] font-bold mb-2 text-black dark:text-white">{t.mk_detail_location}</h2>
              <div className="flex items-center gap-2 text-[14px] text-black/70 dark:text-white/70">
                <MapPin size={15} strokeWidth={1.8} />
                <span>{locationText}</span>
              </div>
            </div>
          )}
        </main>

        <ListingContactBar listing={listing} />
      </div>
    </>
  );
}

export default function ListingDetailPage() {
  return (
    <MarketGuard>
      <ListingDetailPageInner />
    </MarketGuard>
  );
}
