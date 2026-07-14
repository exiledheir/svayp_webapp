import React, { useEffect, useRef, useState } from 'react';
import { Images, Camera, Plus, Check, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getFavoriteProducts, getAllProducts } from '@/lib/api';
import type { Product } from '@/types';

const PAGE_SIZE = 20;

/**
 * Closet v2 add sheet — replaces PhotoSourceSheet in the closet.
 * Two photo sources (Gallery / Camera) plus a shop catalog. The sheet starts as
 * a peek and expands to (near) full-screen once the user scrolls, loading the
 * catalog page by page. Swipe down (from the top) to dismiss.
 */
export default function AddItemSheet({
  onClose,
  onGallery,
  onCamera,
  onAddProduct,
  showShop,
  addingProductIds,
  addedProductIds,
  dark,
}: {
  onClose: () => void;
  onGallery: () => void;
  onCamera: () => void;
  onAddProduct: (product: Product) => void;
  showShop: boolean;
  addingProductIds: Set<string>;
  addedProductIds: Set<string>;
  dark: boolean;
}) {
  const { t, locale } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Multi-select in the shop catalog — tap several, then add together.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const idsRef = useRef<Set<string>>(new Set());

  // Swipe-down-to-close (only when the content is scrolled to the top).
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial catalog: user's liked products first, then the general feed.
  useEffect(() => {
    if (!showShop) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [liked, all] = await Promise.all([
          getFavoriteProducts(0, 12).catch(() => [] as Product[]),
          getAllProducts(0, PAGE_SIZE).catch(() => ({ products: [] as Product[], total: 0 })),
        ]);
        if (!alive) return;
        const merged: Product[] = [];
        for (const p of [...liked, ...all.products]) {
          if (!idsRef.current.has(p.id)) { idsRef.current.add(p.id); merged.push(p); }
        }
        setProducts(merged);
        pageRef.current = 0;
        hasMoreRef.current = all.products.length >= PAGE_SIZE;
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [showShop]);

  async function loadMore() {
    if (loadingMore || !hasMoreRef.current) return;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const r = await getAllProducts(next, PAGE_SIZE);
      const fresh = r.products.filter((p) => !idsRef.current.has(p.id));
      fresh.forEach((p) => idsRef.current.add(p.id));
      if (fresh.length) setProducts((prev) => [...prev, ...fresh]);
      pageRef.current = next;
      hasMoreRef.current = r.products.length >= PAGE_SIZE;
    } catch {
      hasMoreRef.current = false;
    } finally {
      setLoadingMore(false);
    }
  }

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop > 8 && !expanded) setExpanded(true);
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 340) loadMore();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function addSelected() {
    products.filter((p) => selected.has(p.id)).forEach((p) => onAddProduct(p));
    setSelected(new Set());
  }

  function onTouchStart(e: React.TouchEvent) {
    dragStartRef.current = (scrollRef.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (dragStartRef.current == null) return;
    const dy = e.touches[0].clientY - dragStartRef.current;
    setDragY(dy > 0 ? dy : 0);
  }
  function onTouchEnd() {
    if (dragStartRef.current == null) return;
    const close = dragY > 90;
    dragStartRef.current = null;
    if (close) onClose(); else setDragY(0);
  }

  const titleOf = (p: Product) => p.titleLocalized?.[locale] || p.title;
  const idleRow = dark ? '#2c2c2e' : '#f5f2f5';
  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: 'rgba(15,8,14,0.42)' }} onClick={onClose}>
      <div
        className="w-full max-w-[460px] rounded-t-3xl flex flex-col"
        style={{
          background: dark ? '#1c1c1e' : '#fff',
          height: expanded ? '95%' : '68%',
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragStartRef.current == null ? 'height 0.3s ease, transform 0.25s ease' : 'height 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-9 h-1 rounded-full" style={{ background: dark ? '#3a3a3c' : '#e2dbe1' }} />
        </div>

        <div ref={scrollRef} onScroll={onScroll} className="px-5 pb-8 overflow-y-auto flex-1 min-h-0">
          <h3 className="text-[17px] font-bold text-center mb-3" style={{ color: ink }}>{t.cv_add_title}</h3>

          {/* Source rows */}
          <button onClick={() => onGallery()} className="w-full flex items-center gap-4 rounded-2xl px-3 py-2.5 mb-1.5 active:scale-[0.99] transition-transform">
            <span className="w-[52px] h-[52px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#f093fb,#F5576c)' }}>
              <Images size={23} color="#fff" strokeWidth={1.9} />
            </span>
            <span className="text-left">
              <span className="block text-[16px] font-extrabold tracking-[-0.2px]" style={{ color: ink }}>{t.cv_src_gallery}</span>
              <span className="block text-[12.5px]" style={{ color: sub }}>{t.cv_src_gallery_sub}</span>
            </span>
          </button>
          <button onClick={() => onCamera()} className="w-full flex items-center gap-4 rounded-2xl px-3 py-2.5 active:scale-[0.99] transition-transform">
            <span className="w-[52px] h-[52px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: dark ? '#000' : '#141014' }}>
              <Camera size={22} color="#fff" strokeWidth={1.9} />
            </span>
            <span className="text-left">
              <span className="block text-[16px] font-extrabold tracking-[-0.2px]" style={{ color: ink }}>{t.cv_src_camera}</span>
              <span className="block text-[12.5px]" style={{ color: sub }}>{t.cv_src_camera_sub}</span>
            </span>
          </button>

          {/* Shop catalog — vertical grid, paginated */}
          {showShop && (
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${dark ? '#2a2a2c' : '#ececed'}` }}>
              <span className="block text-[15px] font-extrabold mb-2.5" style={{ color: ink }}>{t.cv_shop_title}</span>

              {loading && products.length === 0 && (
                <div className="flex items-center justify-center py-10" style={{ color: sub }}><Loader2 size={20} className="animate-spin" /></div>
              )}
              {!loading && products.length === 0 && (
                <div className="text-center py-10 text-[13px]" style={{ color: sub }}>{t.cv_shop_empty}</div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                {products.map((p) => {
                  const adding = addingProductIds.has(p.id);
                  const added = addedProductIds.has(p.id);
                  const isSel = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => { if (!adding && !added) toggleSelect(p.id); }}
                      className="relative rounded-2xl p-2.5 text-left active:scale-[0.98] transition-transform"
                      style={{ background: dark ? '#141014' : '#fff', border: `1.5px solid ${added ? '#2FB27A' : isSel ? '#F370A7' : dark ? '#2a2a2c' : '#ececed'}` }}
                    >
                      <div className="rounded-xl mb-2 overflow-hidden" style={{ aspectRatio: '4 / 5', background: idleRow }}>
                        {p.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : null}
                      </div>
                      <span className="block text-[12.5px] font-bold leading-tight truncate" style={{ color: ink }}>{titleOf(p)}</span>
                      <span className="block text-[11px] mt-0.5 truncate" style={{ color: sub }}>{p.brand}</span>
                      <span
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white"
                        style={{ background: added ? '#2FB27A' : (isSel || adding) ? '#F370A7' : 'rgba(15,8,14,0.35)', boxShadow: added || (!isSel && !adding) ? 'none' : '0 4px 10px -3px rgba(243,112,167,0.6)' }}
                      >
                        {adding ? <Loader2 size={15} className="animate-spin" /> : added ? <Check size={15} strokeWidth={3} /> : isSel ? <Check size={15} strokeWidth={3} /> : <Plus size={16} strokeWidth={2.6} />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {loadingMore && (
                <div className="flex items-center justify-center py-4" style={{ color: sub }}><Loader2 size={18} className="animate-spin" /></div>
              )}
            </div>
          )}
        </div>

        {/* Sticky "add selected" bar */}
        {selected.size > 0 && (
          <div className="flex-none px-5 pt-2.5 pb-6" style={{ borderTop: `1px solid ${dark ? '#2a2a2c' : '#ececed'}`, background: dark ? '#1c1c1e' : '#fff' }}>
            <button
              onClick={addSelected}
              className="w-full h-13 rounded-2xl text-white text-[15px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              style={{ background: '#F370A7', height: 52 }}
            >
              <Plus size={18} strokeWidth={2.6} />{t.cv_shop_add_n.replace('{n}', String(selected.size))}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
