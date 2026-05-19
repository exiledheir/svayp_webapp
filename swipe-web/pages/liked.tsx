import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Heart, ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { getFavoriteProducts, removeFavorite } from '@/lib/api';
import { formatPrice } from '@/lib/cart-storage';
import type { Product } from '@/types';

export default function LikedPage() {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFavoriteProducts()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleUnlike(e: React.MouseEvent, item: Product) {
    e.stopPropagation();
    setItems((prev) => prev.filter((p) => p.id !== item.id));
    try { await removeFavorite(item.id); } catch { /* best-effort */ }
  }

  return (
    <div className="phone-container flex flex-col bg-white" style={{ height: '100dvh' }}>

      {/* ── Glass top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-50 px-4 pt-2 pb-1 pointer-events-none">
        <div
          className="flex items-center gap-1 px-2 py-2 pointer-events-auto"
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 22,
            border: '0.5px solid rgba(0,0,0,0.16)',
          }}
        >
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center"
            onClick={() => router.back()}
            aria-label="Back"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span className="flex-1 text-[17px] font-bold tracking-[-0.3px]">Liked</span>
          <div className="w-10" />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto" style={{ paddingTop: 72, paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        {loading ? (
          <div className="flex items-center justify-center mt-24">
            <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 mt-24">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.05)' }}
            >
              <Heart size={28} strokeWidth={1.5} color="rgba(0,0,0,0.3)" />
            </div>
            <p className="text-[15px] font-semibold" style={{ color: '#000' }}>No liked items yet</p>
            <p className="text-[13px]" style={{ color: 'rgba(0,0,0,0.45)' }}>Swipe right on products you love</p>
            <button
              className="mt-2 px-6 py-2.5 rounded-2xl text-[13px] font-semibold text-white"
              style={{ background: '#000' }}
              onClick={() => router.push('/discover')}
            >
              Discover products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 pt-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="cursor-pointer"
                onClick={() => router.push(`/product/${item.id}`)}
              >
                {/* Image */}
                <div className="relative overflow-hidden" style={{ aspectRatio: '4/5', borderRadius: 14, background: '#F7F7F8' }}>
                  {item.images?.[0] ? (
                    <Image
                      src={item.images[0]}
                      alt={item.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgba(0,0,0,0.2)' }}>
                      <Heart size={24} strokeWidth={1.5} />
                    </div>
                  )}
                  {/* Unlike button */}
                  <button
                    className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(255,255,255,0.85)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                    onClick={(e) => handleUnlike(e, item)}
                    aria-label="Unlike"
                  >
                    <Heart size={15} strokeWidth={2} color="#FF3B30" fill="#FF3B30" />
                  </button>
                </div>
                {/* Info */}
                <div className="mt-2 px-0.5">
                  <p className="text-[11px] truncate" style={{ color: 'rgba(0,0,0,0.45)' }}>{item.brand}</p>
                  <p className="text-[13px] font-medium leading-snug truncate" style={{ color: '#000' }}>{item.title}</p>
                  <p className="text-[14px] font-bold mt-0.5" style={{ color: '#000' }}>{formatPrice(item.price, item.currency)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

