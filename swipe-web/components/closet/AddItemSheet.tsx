import React, { useEffect, useRef, useState } from 'react';
import { Images, Camera, Plus, Check, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getCatalogReadyProducts } from '@/lib/api';
import type { Product } from '@/types';

const PAGE_SIZE = 20;

/**
 * Closet v2 add sheet — replaces PhotoSourceSheet in the closet.
 *
 * Намеренно повторяет вёрстку первого запуска (`SetupAddSheet`): заголовок с
 * подзаголовком, тёмная карточка «Камера» и розовая «Галерея», ниже — товары
 * магазина. Раньше это был совсем другой лист (иконка + две строки текста), и
 * пользователь, прошедший first-run, не узнавал экран добавления.
 *
 * Отличия от setup-версии: тема (тёмная/светлая), пагинация каталога и
 * состояния «добавляется / уже в гардеробе» — их в setup нет.
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
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const idsRef = useRef<Set<string>>(new Set());

  // Swipe-down-to-close (only when the content is scrolled to the top).
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Курируемый каталог: только предобработанные товары (catalog-ready), чтобы
  // «добавить в гардероб» было мгновенным, без ML-фолбэка на неготовых.
  useEffect(() => {
    if (!showShop) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const r = await getCatalogReadyProducts(0, PAGE_SIZE).catch(() => ({ products: [] as Product[], total: 0 }));
        if (!alive) return;
        const merged: Product[] = [];
        for (const p of r.products) {
          if (!idsRef.current.has(p.id)) { idsRef.current.add(p.id); merged.push(p); }
        }
        setProducts(merged);
        pageRef.current = 0;
        hasMoreRef.current = r.products.length >= PAGE_SIZE;
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
      const r = await getCatalogReadyProducts(next, PAGE_SIZE);
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

  // Пагинация каталога — по горизонтальной прокрутке ленты.
  function onRowScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollWidth - el.scrollLeft - el.clientWidth < 260) loadMore();
  }

  // Один тап по товару = добавить и сразу выйти из шита. Уже добавленную в
  // гардероб вещь (addedProductIds — из реального состава гардероба) повторно не
  // добавляем: карточка помечена галкой и не тапабельна.
  function pickProduct(p: Product) {
    if (addingProductIds.has(p.id) || addedProductIds.has(p.id)) return;
    onAddProduct(p);
    onClose();
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
      {/* Лист по высоте контента (как в first-run), а не на 68% экрана: каталог
          теперь горизонтальная лента, тянуть лист на весь экран больше незачем. */}
      <div
        className="w-full max-w-[460px] rounded-t-3xl flex flex-col"
        style={{
          background: dark ? '#1c1c1e' : '#fff',
          maxHeight: '92%',
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragStartRef.current == null ? 'transform 0.25s ease' : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-9 h-1 rounded-full" style={{ background: dark ? '#3a3a3c' : '#e2dbe1' }} />
        </div>

        <div ref={scrollRef} className="px-5 pb-8 overflow-y-auto min-h-0">
          <h3 className="text-[20px] font-extrabold text-center" style={{ color: ink }}>{t.cv_add_title}</h3>
          <p className="text-[13.5px] leading-snug text-center mt-1.5" style={{ color: sub }}>{t.su_sheet_sub}</p>

          {/* Источники — как в first-run: камера тёмной карточкой, галерея розовой. */}
          <div className="flex flex-col gap-2.5 mt-4">
            <button
              onClick={() => onCamera()}
              className="flex items-center gap-3.5 w-full text-left active:scale-[0.99] transition-transform"
              style={{ padding: 14, borderRadius: 18, background: dark ? '#000' : '#141014' }}
            >
              <span className="flex items-center justify-center flex-none" style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.14)' }}>
                <Camera size={20} color="#fff" strokeWidth={2} />
              </span>
              <span className="flex-1 min-w-0 text-[16px] font-bold text-white">{t.cv_src_camera}</span>
            </button>

            <button
              onClick={() => onGallery()}
              className="flex items-center gap-3.5 w-full text-left active:scale-[0.99] transition-transform"
              style={{
                padding: 14, borderRadius: 18,
                background: dark ? 'rgba(243,112,167,0.14)' : '#FFF3F8',
                border: `1px solid ${dark ? 'rgba(243,112,167,0.32)' : '#FADCEA'}`,
              }}
            >
              <span className="flex items-center justify-center flex-none" style={{ width: 44, height: 44, borderRadius: 14, background: '#F370A7' }}>
                <Images size={20} color="#fff" strokeWidth={2} />
              </span>
              <span className="flex-1 min-w-0 text-[16px] font-bold" style={{ color: ink }}>{t.cv_src_gallery}</span>
            </button>
          </div>

          {/* Shop catalog — горизонтальная лента, как в first-run: каталог не
              должен превращать лист добавления в бесконечную вертикальную
              простыню, из-за которой не видно источников фото. */}
          {showShop && (
            <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${dark ? '#2a2a2c' : '#ececed'}` }}>
              <span className="block text-[15px] font-bold mb-3" style={{ color: ink }}>{t.cv_shop_title}</span>

              {loading && products.length === 0 ? (
                <div className="flex items-center justify-center" style={{ height: 128, color: sub }}><Loader2 size={20} className="animate-spin" /></div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-[13px]" style={{ color: sub }}>{t.cv_shop_empty}</div>
              ) : (
                <div className="relative">
                  <div onScroll={onRowScroll} className="flex gap-2.5 overflow-x-auto hide-scrollbar" style={{ paddingBottom: 2 }}>
                    {products.map((p) => {
                      const adding = addingProductIds.has(p.id);
                      const added = addedProductIds.has(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => pickProduct(p)}
                          disabled={adding || added}
                          className="text-left flex-none active:scale-[0.97] transition-transform"
                          style={{ width: 106, opacity: added ? 0.6 : 1 }}
                        >
                          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '106 / 128', borderRadius: 14, background: idleRow }}>
                            {p.images?.[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : null}
                            <span
                              className="absolute flex items-center justify-center text-white"
                              style={{ top: 6, right: 6, width: 24, height: 24, borderRadius: 999, background: added ? '#2FB27A' : '#F370A7' }}
                            >
                              {adding ? <Loader2 size={13} className="animate-spin" /> : added ? <Check size={13} strokeWidth={3} /> : <Plus size={15} strokeWidth={3} />}
                            </span>
                          </div>
                          <span className="block text-[12px] font-semibold leading-tight truncate mt-1.5" style={{ color: ink }}>{titleOf(p)}</span>
                          <span className="block text-[11px] leading-tight truncate mt-0.5" style={{ color: sub }}>{p.brand}</span>
                        </button>
                      );
                    })}
                    {loadingMore && (
                      <span className="flex-none flex items-center justify-center" style={{ width: 44, height: 128, color: sub }}>
                        <Loader2 size={18} className="animate-spin" />
                      </span>
                    )}
                  </div>
                  {/* Затухание у правого края — подсказка, что лента прокручивается. */}
                  <div
                    className="absolute top-0 right-0 pointer-events-none"
                    style={{ width: 34, height: 128, background: `linear-gradient(90deg,${dark ? 'rgba(28,28,30,0)' : 'rgba(255,255,255,0)'} 0,${dark ? '#1c1c1e' : '#fff'} 80%)` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
