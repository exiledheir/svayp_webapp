import { needsUnoptimized } from '@/lib/img';
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Heart } from 'lucide-react';
import type { Product } from '@/types';
import { isLiked, toggleLiked } from '@/lib/liked-storage';
import { formatPrice } from '@/lib/cart-storage';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const [liked, setLiked] = React.useState(false);

  React.useEffect(() => {
    setLiked(isLiked(product.id));
  }, [product.id]);

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    const newState = toggleLiked({
      productId: product.id,
      title: product.title,
      brand: product.brand,
      price: product.price,
      currency: product.currency,
      imageUrl: product.images[0] ?? '',
    });
    setLiked(newState);
  }

  const imageUrl = product.images[0] ?? '';

  return (
    <div
      className="cursor-pointer overflow-hidden"
      style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      onClick={() => router.push(`/product/${product.id}`)}
    >
      {/* Image — 4:5 ratio matching Flutter TikTok card */}
      <div className="relative" style={{ aspectRatio: '4/5', background: '#F7F7F8' }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 430px) 50vw, 215px"
            className="object-cover"
            unoptimized={needsUnoptimized(imageUrl)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[12px]" style={{ color: 'rgba(0,0,0,0.3)' }}>
            No image
          </div>
        )}

        {/* Like button */}
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.85)' }}
          onClick={handleLike}
          aria-label="Like"
        >
          <Heart size={14} strokeWidth={2} fill={liked ? '#000' : 'none'} color={liked ? '#000' : 'rgba(0,0,0,0.5)'} />
        </button>

        {/* Discount badge — red, matching Flutter */}
        {(product.discountPercentage ?? 0) > 0 && (
          <span
            className="absolute top-2 left-2 text-white text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: '#FF3B30' }}
          >
            -{product.discountPercentage}%
          </span>
        )}
      </div>

      {/* Info — title → price → seller, fixed 88px height matching Flutter */}
      <div className="px-2.5 pt-2.5 pb-2" style={{ height: 88 }}>
        <p
          className="text-[13px] font-semibold leading-snug"
          style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', color: '#000' }}
        >
          {product.title}
        </p>
        <div className="flex items-baseline gap-1.5 mt-1.5">
          <span className="text-[13px] font-bold leading-none">{formatPrice(product.price, product.currency)}</span>
          {(product.originalPrice ?? 0) > product.price && (
            <span className="text-[10px] line-through" style={{ color: 'rgba(0,0,0,0.4)' }}>
              {formatPrice(product.originalPrice!, product.currency)}
            </span>
          )}
        </div>
        <p className="text-[11px] mt-1 truncate" style={{ color: 'rgba(0,0,0,0.5)' }}>{product.brand}</p>
      </div>
    </div>
  );
}
