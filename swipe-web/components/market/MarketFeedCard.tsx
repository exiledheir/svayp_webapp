import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Heart, MapPin } from 'lucide-react';
import type { MarketListing } from '@/types/market';
import { toggleFavorite } from '@/lib/market-storage';
import { formatPrice } from '@/lib/cart-storage';
import { useI18n } from '@/lib/i18n';

interface Props {
  listing: MarketListing;
  /** Optional callback so parent feeds can re-sync favorite state. */
  onToggleFavorite?: (id: string, next: boolean) => void;
}

export default function MarketFeedCard({ listing, onToggleFavorite }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [liked, setLiked] = React.useState(!!listing.isFavorite);

  React.useEffect(() => {
    setLiked(!!listing.isFavorite);
  }, [listing.isFavorite]);

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    const next = toggleFavorite(listing.id);
    setLiked(next);
    onToggleFavorite?.(listing.id, next);
  }

  const imageUrl = listing.images[0] ?? '';
  const priceText =
    listing.dealType === 'free' ? t.mk_free : formatPrice(listing.price, t.mk_currency_uzs);

  return (
    <div
      className="cursor-pointer overflow-hidden bg-white dark:bg-[#1c1c1e]"
      style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      onClick={() => router.push(`/market/${listing.id}`)}
    >
      {/* Image — 4:5 ratio */}
      <div className="relative" style={{ aspectRatio: '4/5', background: '#F7F7F8' }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={listing.title}
            fill
            sizes="(max-width: 430px) 50vw, 215px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[12px]" style={{ color: 'rgba(0,0,0,0.3)' }}>
            No image
          </div>
        )}

        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.85)' }}
          onClick={handleLike}
          aria-label="Like"
        >
          <Heart size={14} strokeWidth={2} fill={liked ? '#000' : 'none'} color={liked ? '#000' : 'rgba(0,0,0,0.5)'} />
        </button>

        {listing.isUrgent && (
          <span
            className="absolute top-2 left-2 text-white text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: '#F370A7' }}
          >
            ⚡ {t.mk_negotiable}
          </span>
        )}
        {listing.dealType === 'free' && (
          <span
            className="absolute bottom-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#3BA55D' }}
          >
            {t.mk_free}
          </span>
        )}
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
        {listing.location.address && (
          <div className="flex items-center gap-1 mt-1.5 text-[11px] truncate" style={{ color: 'rgba(0,0,0,0.45)' }}>
            <MapPin size={11} strokeWidth={1.8} className="shrink-0 text-black/45 dark:text-white/45" />
            <span className="truncate text-black/45 dark:text-white/45">{listing.location.address}</span>
          </div>
        )}
      </div>
    </div>
  );
}
