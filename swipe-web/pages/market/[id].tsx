import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, Heart, MapPin, Truck, User } from 'lucide-react';
import type { MarketListing } from '@/types/market';
import { getListingById, toggleFavorite } from '@/lib/market-storage';
import {
  conditionLabel, seasonLabel, lengthLabel, colorLabel, materialLabel, countryLabel, getCategory,
} from '@/lib/market-attributes';
import { taxLabel } from '@/lib/wardrobe-taxonomy';
import ListingContactBar from '@/components/market/ListingContactBar';
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

  useEffect(() => {
    if (typeof id !== 'string') return;
    const l = getListingById(id) ?? null;
    setListing(l);
    setLiked(!!l?.isFavorite);
    setReady(true);
    if (l) logAnalyticsEvent(Events.MARKET_LISTING_VIEWED, { listing_id: l.id, category: l.category });
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
  if (category) rows.push({ label: t.mk_categories, value: category.label });
  if (listing.brand) rows.push({ label: t.mk_char_brand, value: listing.brand });
  if (listing.size) rows.push({ label: t.mk_char_size, value: listing.size });
  if (listing.fit) rows.push({ label: t.mk_char_fit, value: taxLabel(listing.fit, locale) });
  if (listing.color) rows.push({ label: t.mk_char_color, value: colorLabel(t, listing.color) });
  if (listing.season) rows.push({ label: t.mk_char_season, value: seasonLabel(t, listing.season) });
  if (listing.length) rows.push({ label: t.mk_char_length, value: lengthLabel(t, listing.length) });
  if (listing.material) rows.push({ label: t.mk_char_material, value: materialLabel(listing.material, locale) });
  if (listing.country) rows.push({ label: t.mk_char_country, value: countryLabel(listing.country, locale) });

  function handleLike() {
    const next = toggleFavorite(listing!.id);
    setLiked(next);
  }

  const loc = listing.location;
  const hasCoords = loc.latitude != null && loc.longitude != null;
  const mapUrl = hasCoords
    ? `https://static-maps.yandex.ru/1.x/?ll=${loc.longitude},${loc.latitude}&z=15&size=600,300&l=map&pt=${loc.longitude},${loc.latitude},pm2rdm`
    : null;
  // Tapping the map opens the location in the user's maps app.
  const externalMapUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`
    : null;

  return (
    <>
      <Head>
        <title>{listing.title}</title>
      </Head>

      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-3 pt-3 pointer-events-none">
          <button
            onClick={() => router.back()}
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
          <div className="flex overflow-x-auto" style={{ scrollSnapType: 'x mandatory' }}>
            {(listing.images.length ? listing.images : ['']).map((src, i) => (
              <div key={i} className="relative shrink-0 w-full" style={{ aspectRatio: '4/5', background: '#F7F7F8', scrollSnapAlign: 'start' }}>
                {src && <Image src={src} alt={`${listing.title} ${i + 1}`} fill sizes="430px" className="object-cover" unoptimized />}
              </div>
            ))}
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

          {/* Location */}
          {(loc.address || mapUrl) && (
            <div className="px-4 pt-5">
              <h2 className="text-[15px] font-bold mb-2 text-black dark:text-white">{t.mk_detail_location}</h2>
              {loc.address && (
                <div className="flex items-center gap-2 text-[14px] mb-2 text-black/70 dark:text-white/70">
                  <MapPin size={15} strokeWidth={1.8} />
                  <span>{loc.address}{loc.landmark ? `, ${loc.landmark}` : ''}</span>
                </div>
              )}
              {mapUrl && (
                <a
                  href={externalMapUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block w-full rounded-2xl overflow-hidden active:opacity-90"
                  style={{ aspectRatio: '2/1', background: '#F7F7F8' }}
                  aria-label={t.mk_detail_location}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mapUrl} alt="map" className="w-full h-full object-cover" />
                  <span
                    className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold text-black"
                    style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}
                  >
                    <MapPin size={13} strokeWidth={2} />
                    {t.mk_detail_open_map}
                  </span>
                </a>
              )}
              {loc.courier && (
                <div className="flex items-center gap-2 text-[13px] mt-2 text-[#3BA55D] font-semibold">
                  <Truck size={15} strokeWidth={1.8} />
                  <span>{t.mk_courier_available}</span>
                </div>
              )}
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
