import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Heart, MapPin } from 'lucide-react';
import type { MarketListing } from '@/types/market';
import { addFavorite, removeFavorite } from '@/lib/market-api';
import { regionLabel } from '@/lib/market-attributes';
import { formatPrice } from '@/lib/cart-storage';
import { useI18n } from '@/lib/i18n';
import CarouselDots from '@/components/market/CarouselDots';

interface Props {
  listing: MarketListing;
  /** Optional callback so parent feeds can re-sync favorite state. */
  onToggleFavorite?: (id: string, next: boolean) => void;
  /** Hide the favorite (heart) button — e.g. on the user's own listings. */
  hideFavorite?: boolean;
  /**
   * Custom overlay rendered over the image (e.g. manage actions in My listings).
   * When provided, the promo badges (urgent / free) are suppressed to leave room.
   */
  overlay?: React.ReactNode;
}

export default function MarketFeedCard({ listing, onToggleFavorite, hideFavorite, overlay }: Props) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [liked, setLiked] = React.useState(!!listing.isFavorite);
  const [imgIdx, setImgIdx] = React.useState(0);

  React.useEffect(() => {
    setLiked(!!listing.isFavorite);
  }, [listing.isFavorite]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.clientWidth) setImgIdx(Math.round(el.scrollLeft / el.clientWidth));
  }

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !liked;
    setLiked(next); // optimistic
    onToggleFavorite?.(listing.id, next);
    try {
      if (next) await addFavorite(listing.id);
      else await removeFavorite(listing.id);
    } catch {
      setLiked(!next); // revert on failure
      onToggleFavorite?.(listing.id, !next);
    }
  }

  const images = listing.images.length ? listing.images : [''];
  const priceText =
    listing.dealType === 'free'
      ? t.mk_free
      : formatPrice(listing.price, listing.currency === 'USD' ? 'USD' : t.mk_currency_uzs);

  return (
    <div
      className="cursor-pointer overflow-hidden bg-white dark:bg-[#1c1c1e]"
      style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      onClick={() => router.push(`/market/${listing.id}`)}
    >
      {/* Image — 4:5 ratio, swipeable when there are multiple photos */}
      <div className="relative" style={{ aspectRatio: '4/5', background: '#F7F7F8' }}>
        <div
          className="absolute inset-0 flex overflow-x-auto hide-scrollbar"
          style={{ scrollSnapType: 'x mandatory' }}
          onScroll={handleScroll}
        >
          {images.map((src, i) => (
            <div key={i} className="relative shrink-0 w-full h-full" style={{ scrollSnapAlign: 'start' }}>
              {src ? (
                <Image
                  src={src}
                  alt={`${listing.title} ${i + 1}`}
                  fill
                  sizes="(max-width: 430px) 50vw, 215px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[12px]" style={{ color: 'rgba(0,0,0,0.3)' }}>
                  {t.mk_no_image}
                </div>
              )}
            </div>
          ))}
        </div>

        <CarouselDots count={images.length} active={imgIdx} />

        {!hideFavorite && (
          <button
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.85)' }}
            onClick={handleLike}
            aria-label="Like"
          >
            <Heart size={14} strokeWidth={2} fill={liked ? '#000' : 'none'} color={liked ? '#000' : 'rgba(0,0,0,0.5)'} />
          </button>
        )}

        {/* Promo badges — hidden when a custom (manage) overlay takes the corners. */}
        {!overlay && listing.isUrgent && (
          <span
            className="absolute top-2 left-2 text-white text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: '#F370A7' }}
          >
            ⚡ {t.mk_negotiable}
          </span>
        )}
        {!overlay && listing.dealType === 'free' && (
          <span
            className="absolute bottom-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#3BA55D' }}
          >
            {t.mk_free}
          </span>
        )}

        {overlay}
      </div>

      {/* Info */}
      <div className="px-2.5 pt-2.5 pb-2.5">
        <span className="text-[15px] font-extrabold leading-none text-black dark:text-white">{priceText}</span>
        <p
          className="text-[13px] font-medium leading-snug mt-1.5 text-black dark:text-[#e8e8e8]"
          style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}
        >
          {listing.title}
        </p>
        {(() => {
          const locText = listing.location.region
            ? regionLabel(listing.location.region, locale)
            : listing.location.address;
          return locText ? (
            <div className="flex items-center gap-1 mt-1.5 text-[11px] truncate" style={{ color: 'rgba(0,0,0,0.45)' }}>
              <MapPin size={11} strokeWidth={1.8} className="shrink-0 text-black/45 dark:text-white/45" />
              <span className="truncate text-black/45 dark:text-white/45">{locText}</span>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}
