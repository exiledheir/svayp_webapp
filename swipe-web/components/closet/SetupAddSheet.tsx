import React, { useEffect, useState } from 'react';
import { Camera, Images, Loader2, Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getCatalogReadyProducts } from '@/lib/api';
import type { Product } from '@/types';
import type { SlotKey } from '@/lib/closet-setup';
import { SU } from '@/lib/setup-theme';

/**
 * Shop categories that can fill each slot. `/products/catalog-ready` ignores a
 * `category` param, so we filter its (small, curated) list on the product's own
 * category instead — cross-referencing it against `/products/all?category=…`
 * silently matched almost nothing, because that endpoint pages through the WHOLE
 * catalogue and the handful of catalog-ready items rarely land on page 0.
 */
const SLOT_CATEGORIES: Record<SlotKey, string[]> = {
  top: ['TOPWEAR'],
  bottom: ['BOTTOMWEAR'],
  dress: ['DRESSES', 'ONE_PIECE', 'TWO_PIECE_SET', 'THREE_PIECE_SET'],
  shoes: ['FOOTWEAR'],
};

/** Curated catalog-ready list is small (tens of items) — one page covers it. */
const CATALOG_PAGE = 100;

/**
 * Add-to-closet sheet used by the first-run setup screen.
 *
 * Differs from the closet's own AddItemSheet on purpose: it is titled by the
 * slot being filled, advertises multi-select (it already works, users just
 * never knew), and offers one-tap adds of catalogue items the user may have
 * bought on LIBAS already — a way out of the camera that still fills a slot.
 */
export default function SetupAddSheet({
  slot,
  addedProductIds,
  onClose,
  onCamera,
  onGallery,
  onPickProduct,
}: {
  slot: SlotKey;
  addedProductIds: Set<string>;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onPickProduct: (product: Product) => void;
}) {
  const { t, locale } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const title = {
    top: t.su_slot_top_title,
    bottom: t.su_slot_bottom_title,
    dress: t.su_slot_dress_title,
    shoes: t.su_slot_shoes_title,
  }[slot];

  const shopTitle = {
    top: t.su_shop_tops,
    bottom: t.su_shop_bottoms,
    dress: t.su_shop_dresses,
    shoes: t.su_shop_shoes,
  }[slot];

  // Only catalog-ready products can be added instantly (no photo, no ML
  // fallback), so the row is drawn from that curated list, narrowed to the
  // slot's categories. Never widened when a slot has few matches: showing
  // scarves under "Dresses in the LIBAS shop" is worse than showing nothing.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const ready = await getCatalogReadyProducts(0, CATALOG_PAGE)
        .catch(() => ({ products: [] as Product[], total: 0 }));
      if (!alive) return;
      const wanted = SLOT_CATEGORIES[slot];
      setProducts(ready.products.filter((p) => !!p.category && wanted.includes(p.category)));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [slot]);

  // Items already in the closet are filtered at render, not at fetch, so the
  // list doesn't refetch every time one is added.
  const visible = products.filter((p) => !addedProductIds.has(p.id));

  const titleOf = (p: Product) => p.titleLocalized?.[locale] || p.title;

  function productCard(p: Product, width: number | string) {
    return (
      <button
        key={p.id}
        onClick={() => onPickProduct(p)}
        className="text-left flex-none active:scale-[0.97] transition-transform"
        style={{ width }}
      >
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: '106 / 128', borderRadius: 14, background: SU.surface }}
        >
          {p.images?.[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
          )}
          <span
            className="absolute flex items-center justify-center text-white"
            style={{ top: 6, right: 6, width: 24, height: 24, borderRadius: 999, background: SU.pink }}
          >
            <Plus size={15} strokeWidth={3} />
          </span>
        </div>
        <span className="block truncate" style={{ marginTop: 6, font: '600 12px/1.25 Roboto, system-ui', color: SU.ink }}>
          {titleOf(p)}
        </span>
        <span className="block truncate" style={{ marginTop: 2, font: '400 11px/1.2 Roboto, system-ui', color: '#70707A' }}>
          {p.brand}
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center"
      style={{ background: 'rgba(16,16,20,0.42)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] flex flex-col su-sheet"
        style={{
          background: '#fff',
          borderRadius: '26px 26px 0 0',
          padding: '10px 20px 24px',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="flex-none" style={{ width: 38, height: 4, borderRadius: 99, background: '#E4E4EA', margin: '0 auto 14px' }} />

        <div className="flex-none text-center" style={{ font: '800 20px/1.2 Roboto, system-ui', color: SU.ink }}>{title}</div>
        <div className="flex-none text-center" style={{ marginTop: 6, font: '400 13.5px/1.4 Roboto, system-ui', color: SU.sub }}>
          {t.su_sheet_sub}
        </div>

        {/* Photo sources — camera first: it needs no gallery permission dance. */}
        <div className="flex-none flex flex-col gap-2.5" style={{ marginTop: 18 }}>
          <button
            onClick={onCamera}
            className="flex items-center gap-3.5 w-full text-left active:scale-[0.99] transition-transform"
            style={{ padding: 14, borderRadius: 18, background: SU.ink }}
          >
            <span
              className="flex items-center justify-center flex-none"
              style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.14)' }}
            >
              <Camera size={20} color="#fff" strokeWidth={2} />
            </span>
            <span className="flex-1 min-w-0" style={{ font: '700 16px/1.2 Roboto, system-ui', color: '#fff' }}>
              {t.su_src_camera}
            </span>
          </button>

          <button
            onClick={onGallery}
            className="flex items-center gap-3.5 w-full text-left active:scale-[0.99] transition-transform"
            style={{ padding: 14, borderRadius: 18, background: SU.pinkSoft, border: `1px solid ${SU.pinkSoftBorder}` }}
          >
            <span
              className="flex items-center justify-center flex-none"
              style={{ width: 44, height: 44, borderRadius: 14, background: SU.pink }}
            >
              <Images size={20} color="#fff" strokeWidth={2} />
            </span>
            <span className="flex-1 min-w-0" style={{ font: '700 16px/1.2 Roboto, system-ui', color: SU.ink }}>
              {t.su_src_gallery}
            </span>
          </button>
        </div>

        {/* Shop row — already-bought LIBAS items fill a slot in one tap. */}
        {(loading || visible.length > 0) && (
          <>
            <div className="flex-none" style={{ marginTop: 18, font: '700 15px/1.2 Roboto, system-ui', color: SU.ink }}>
              {shopTitle}
            </div>

            {loading ? (
              <div className="flex-none flex items-center justify-center" style={{ height: 128, marginTop: 11, color: SU.sub }}>
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : (
              <div className="flex-none relative" style={{ marginTop: 11 }}>
                <div className="flex gap-2.5 overflow-x-auto su-hide-scroll" style={{ paddingBottom: 2 }}>
                  {visible.map((p) => productCard(p, 106))}
                </div>
                <div
                  className="absolute top-0 right-0 pointer-events-none"
                  style={{ width: 34, height: 128, background: 'linear-gradient(90deg,rgba(255,255,255,0) 0,#fff 80%)' }}
                />
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .su-sheet { animation: suSheetUp 0.26s cubic-bezier(0.2, 0.8, 0.2, 1); }
        @keyframes suSheetUp { from { transform: translateY(100%); } to { transform: none; } }
        .su-hide-scroll::-webkit-scrollbar { display: none; }
        .su-hide-scroll { scrollbar-width: none; }
        @media (prefers-reduced-motion: reduce) { .su-sheet { animation: none; } }
      `}</style>
    </div>
  );
}
