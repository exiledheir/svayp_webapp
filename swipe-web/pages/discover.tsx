import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Heart, ThumbsDown, RotateCcw, ShoppingBag } from 'lucide-react';
import { getRecommendedProducts } from '@/lib/api';
import { toggleLiked } from '@/lib/liked-storage';
import { addToCart } from '@/lib/cart-storage';
import BottomNav, { TopBar } from '@/components/BottomNav';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import type { Product } from '@/types';

// ─── Price formatter matching Flutter formattedPrice ────────────────────────
function fmtUzs(price: number, currency: string): string {
  if (currency === 'USD') return `$${price.toFixed(2)}`;
  return `${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')} ${currency}`;
}

// ─── Thresholds (match Flutter _swipeThreshold / _swipeUpThreshold) ──────────
const SWIPE_H = 100;   // px — horizontal swipe commit
const SWIPE_V = 120;   // px — upward swipe commit
const VEL_THR = 0.55;  // px/ms

type SwipeDir = 'left' | 'right' | 'up' | null;

// ─── Swipe Card ───────────────────────────────────────────────────────────────
interface CardProps {
  product: Product;
  stackIndex: number;           // 0 = top, 1 = second, 2 = third
  dragProgress: number;         // 0-1 from parent, drives scale of card behind
  onDragProgress: (p: number) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onTap: () => void;
  registerTrigger?: (fn: (dir: SwipeDir) => void) => void;
}

function SwipeCard({
  product, stackIndex, dragProgress,
  onDragProgress, onSwipeLeft, onSwipeRight, onSwipeUp, onTap, registerTrigger,
}: CardProps) {
  const isTop = stackIndex === 0;
  const router = useRouter();

  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const [leaving, setLeaving] = useState<SwipeDir>(null);

  const drag = useRef({ active: false, startX: 0, startY: 0, startMs: 0, lastX: 0, lastY: 0 });

  // Reset img index when product changes
  useEffect(() => { setImgIdx(0); }, [product.id]);

  // ── Scale / offset for stacked cards behind ──────────────────────────────
  const baseScale = 1 - stackIndex * 0.04;
  const baseOffY  = stackIndex * 12;
  const scale = stackIndex === 1 ? baseScale + 0.04 * dragProgress : baseScale;
  const offY  = stackIndex === 1 ? baseOffY * (1 - dragProgress)   : baseOffY;

  // ── Swipe direction + overlay ─────────────────────────────────────────────
  const absX = Math.abs(dx), absY = Math.abs(dy);
  const swipeDir: SwipeDir = isTop
    ? (absX > SWIPE_H && absX >= absY) ? (dx > 0 ? 'right' : 'left')
    : (dy < -SWIPE_V && absY > absX) ? 'up'
    : null
    : null;

  const overlayProgress = (() => {
    if (!swipeDir) return 0;
    const base = swipeDir === 'up' ? absY / SWIPE_V : absX / SWIPE_H;
    return Math.min(0.85, Math.max(0, (base - 1) * 0.85));
  })();
  const overlayColor =
    swipeDir === 'right' ? `rgba(48,209,88,${overlayProgress})` :
    swipeDir === 'left'  ? `rgba(255,59,48,${overlayProgress})`  :
    swipeDir === 'up'    ? `rgba(10,132,255,${overlayProgress})` : 'transparent';

  // ── Pointer events ────────────────────────────────────────────────────────
  function onPointerDown(e: React.PointerEvent) {
    if (!isTop || leaving) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, startMs: Date.now(), lastX: e.clientX, lastY: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active) return;
    const x = e.clientX - drag.current.startX;
    const y = e.clientY - drag.current.startY;
    drag.current.lastX = e.clientX;
    drag.current.lastY = e.clientY;
    setDx(x); setDy(y);
    const dist = Math.sqrt(x * x + y * y);
    onDragProgress(Math.min(1, dist / SWIPE_H));
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!drag.current.active) return;
    drag.current.active = false;
    const x = drag.current.lastX - drag.current.startX;
    const y = drag.current.lastY - drag.current.startY;
    const dt = Math.max(1, Date.now() - drag.current.startMs);
    const ax = Math.abs(x), ay = Math.abs(y);
    const vx = ax / dt, vy = ay / dt;

    if (ax < 8 && ay < 8) {
      // tap — decide: left half prev image, right half next image; center = product detail
      const card = e.currentTarget as HTMLElement;
      const relX = e.clientX - card.getBoundingClientRect().left;
      const w = card.offsetWidth;
      if (relX < w * 0.25 && imgIdx > 0) { setImgIdx(i => i - 1); }
      else if (relX > w * 0.75 && imgIdx < product.images.length - 1) { setImgIdx(i => i + 1); }
      else { onTap(); }
      setDx(0); setDy(0); onDragProgress(0);
      return;
    }

    let dir: SwipeDir = null;
    if ((vx > VEL_THR || ax > SWIPE_H) && ax >= ay) dir = x > 0 ? 'right' : 'left';
    else if ((vy > VEL_THR || ay > SWIPE_V) && ay > ax && y < 0) dir = 'up';

    if (dir) {
      commitSwipe(dir);
    } else {
      setDx(0); setDy(0); onDragProgress(0);
    }
  }

  function commitSwipe(dir: SwipeDir) {
    if (leaving) return;
    setLeaving(dir);
    onDragProgress(1);
    setTimeout(() => {
      if (dir === 'left')  onSwipeLeft();
      if (dir === 'right') onSwipeRight();
      if (dir === 'up')    onSwipeUp();
    }, 360);
  }

  // Register trigger for action buttons (only top card)
  useEffect(() => {
    if (stackIndex === 0) registerTrigger?.(commitSwipe);
  }); // run every render so latest commitSwipe is always registered

  const exitTransform =
    leaving === 'left'  ? 'translate(-160%, 10%) rotate(-20deg)' :
    leaving === 'right' ? 'translate(160%, 10%) rotate(20deg)'   :
    leaving === 'up'    ? 'translate(0, -150%) rotate(0deg)'     : '';

  const rot = Math.max(-12, Math.min(12, (dx / 400) * 12));

  const transform = leaving
    ? exitTransform
    : `translate(${isTop ? dx : 0}px, ${(isTop ? dy : 0) + offY}px) rotate(${isTop ? rot : 0}deg) scale(${scale})`;

  const transition = drag.current.active
    ? 'none'
    : leaving
    ? 'transform 0.36s ease-out'
    : 'transform 0.22s ease-out';

  const images = product.images.filter(Boolean);
  const currentImg = images[imgIdx] ?? '';

  return (
    <div
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
      style={{ transform, transition, zIndex: 10 - stackIndex, transformOrigin: 'center 80%' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Single card div — shadow lives here, content clipped inside */}
      <div
        className="w-full h-full flex flex-col overflow-hidden"
        style={{
          borderRadius: 28,
          background: 'white',
          boxShadow: stackIndex === 0
            ? '0 24px 64px -4px rgba(0,0,0,0.18), 0 8px 32px -4px rgba(0,0,0,0.10)'
            : '0 8px 20px rgba(0,0,0,0.08)',
        }}
      >
        {/* ── Image area ── */}
        <div className="relative flex-1 overflow-hidden" style={{ background: 'white' }}>
          {currentImg ? (
            <Image
              key={currentImg}
              src={currentImg}
              alt={product.title}
              fill
              className="object-cover pointer-events-none"
              sizes="(max-width: 430px) 100vw, 430px"
              unoptimized
              priority={stackIndex === 0}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[13px]" style={{ color: 'rgba(0,0,0,0.3)' }}>No image</div>
          )}

          {/* Swipe overlay */}
          {isTop && overlayProgress > 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ backgroundColor: overlayColor }}
            >
              <span className="text-white text-7xl drop-shadow-lg select-none">
                {swipeDir === 'right' ? '❤️' : swipeDir === 'left' ? '👎' : '🛍️'}
              </span>
            </div>
          )}

          {/* Image dots */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
              {images.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === imgIdx ? 7 : 6,
                    height: i === imgIdx ? 7 : 6,
                    background: i === imgIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Info panel ── */}
        <div
          className="px-5 py-3.5 flex flex-col gap-0.5"
          style={{ background: 'white', borderTop: '0.5px solid rgba(0,0,0,0.10)' }}
        >
          <p
            className="font-semibold text-[15px] leading-snug"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {product.title}
          </p>
          <p className="text-[12px]" style={{ color: 'rgba(0,0,0,0.53)' }}>{product.brand}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[18px] font-bold leading-none">{fmtUzs(product.price, product.currency)}</span>
            {(product.discountPercentage ?? 0) > 0 && (
              <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,59,48,0.8)' }}>
                -{product.discountPercentage}%
              </span>
            )}
            {(product.originalPrice ?? 0) > product.price && (
              <span className="text-[12px] line-through" style={{ color: 'rgba(0,0,0,0.38)' }}>{fmtUzs(product.originalPrice!, product.currency)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DiscoverPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<{ product: Product; action: string }[]>([]);
  const [dragProgress, setDragProgress] = useState(0);
  const [fetchPage, setFetchPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);

  // Cart dialog state
  const [cartProduct, setCartProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  // Trigger ref — top card sets this so action buttons can fire a swipe
  const triggerTopSwipe = useRef<((dir: SwipeDir) => void) | null>(null);

  // Аналитика: показы карточек (дедуп в рамках визита), время просмотра верхней
  // карточки и однократное feed_exhausted. Имена событий совпадают с мобилкой.
  const seenImpressionsRef = useRef<Set<string>>(new Set());
  const impressionStartRef = useRef<number>(Date.now());
  const exhaustedLoggedRef = useRef(false);

  useEffect(() => {
    logAnalyticsEvent(Events.DISCOVER_VIEWED);
    getRecommendedProducts(0, 20)
      .then((res) => { setProducts(res); setHasMore(res.length === 20); })
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  // Верхняя карточка стека = показ товара.
  useEffect(() => {
    const p = products[currentIndex];
    if (!p) return;
    impressionStartRef.current = Date.now();
    if (seenImpressionsRef.current.has(p.id)) return;
    seenImpressionsRef.current.add(p.id);
    logAnalyticsEvent(Events.PRODUCT_IMPRESSION, {
      [Params.PRODUCT_ID]: p.id,
      [Params.POSITION]: currentIndex,
    });
  }, [currentIndex, products]);

  // Лента закончилась (и подгружать больше нечего) — один раз за визит.
  useEffect(() => {
    if (loading || products.length === 0) return;
    if (currentIndex >= products.length && !hasMore && !exhaustedLoggedRef.current) {
      exhaustedLoggedRef.current = true;
      logAnalyticsEvent(Events.FEED_EXHAUSTED, { [Params.POSITION]: products.length });
    }
  }, [currentIndex, products.length, hasMore, loading]);

  function logSwipe(p: Product, direction: 'like' | 'dislike') {
    logAnalyticsEvent(Events.PRODUCT_SWIPED, {
      [Params.PRODUCT_ID]: p.id,
      [Params.DIRECTION]: direction,
      [Params.BRAND]: p.brand,
      [Params.PRICE]: p.price,
      [Params.VIEW_DURATION_MS]: Date.now() - impressionStartRef.current,
    });
  }

  function logAddToCart(p: Product, size?: string, color?: string) {
    logAnalyticsEvent(Events.PRODUCT_ADDED_TO_CART, {
      [Params.PRODUCT_ID]: p.id,
      [Params.BRAND]: p.brand,
      [Params.PRICE]: p.price,
      ...(size ? { [Params.SIZE]: size } : {}),
      ...(color ? { [Params.COLOR]: color } : {}),
    });
  }

  const checkLoadMore = useCallback((idx: number, current: Product[], has: boolean) => {
    if (current.length - idx <= 5 && has && !fetchingMore) {
      const nextPage = fetchPage + 1;
      setFetchingMore(true);
      getRecommendedProducts(nextPage, 20)
        .then((res) => {
          setProducts((prev) => [...prev, ...res]);
          setFetchPage(nextPage);
          setHasMore(res.length === 20);
        })
        .finally(() => setFetchingMore(false));
    }
  }, [fetchPage, fetchingMore]);

  function handleSwipeLeft() {
    logSwipe(products[currentIndex], 'dislike');
    setHistory((h) => [...h, { product: products[currentIndex], action: 'dislike' }]);
    const next = currentIndex + 1;
    setCurrentIndex(next);
    setDragProgress(0);
    checkLoadMore(next, products, hasMore);
  }

  function handleSwipeRight() {
    const p = products[currentIndex];
    logSwipe(p, 'like');
    toggleLiked({ productId: p.id, title: p.title, brand: p.brand, price: p.price, currency: p.currency, imageUrl: p.images[0] ?? '' });
    setHistory((h) => [...h, { product: p, action: 'like' }]);
    const next = currentIndex + 1;
    setCurrentIndex(next);
    setDragProgress(0);
    checkLoadMore(next, products, hasMore);
  }

  function handleSwipeUp() {
    const p = products[currentIndex];
    if (p.sizes && p.sizes.length > 1) {
      setSelectedSize('');
      setSelectedColor('');
      setCartProduct(p);
    } else {
      addToCart({
        productId: p.id, title: p.title, brand: p.brand,
        price: p.price, currency: p.currency, imageUrl: p.images[0] ?? '',
        selectedSize: p.sizes?.[0], quantity: 1,
      });
      logAddToCart(p, p.sizes?.[0]);
      setHistory((h) => [...h, { product: p, action: 'cart' }]);
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setDragProgress(0);
      checkLoadMore(next, products, hasMore);
    }
  }

  function handleCartConfirm() {
    if (!cartProduct) return;
    addToCart({
      productId: cartProduct.id, title: cartProduct.title, brand: cartProduct.brand,
      price: cartProduct.price, currency: cartProduct.currency, imageUrl: cartProduct.images[0] ?? '',
      selectedSize: selectedSize || undefined, selectedColor: selectedColor || undefined, quantity: 1,
    });
    logAddToCart(cartProduct, selectedSize || undefined, selectedColor || undefined);
    setHistory((h) => [...h, { product: cartProduct, action: 'cart' }]);
    const next = currentIndex + 1;
    setCurrentIndex(next);
    setDragProgress(0);
    setCartProduct(null);
    checkLoadMore(next, products, hasMore);
  }

  function handleUndo() {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    logAnalyticsEvent(Events.SWIPE_UNDO, {
      [Params.PRODUCT_ID]: last.product.id,
      [Params.DIRECTION]: last.action,
    });
    setCurrentIndex((i) => Math.max(0, i - 1));
    setHistory((h) => h.slice(0, -1));
    setDragProgress(0);
  }

  return (
    <div className="phone-container flex flex-col bg-white" style={{ height: '100dvh' }}>

      {/* ── Floating glass top bar (matches Flutter MainTopBar) ── */}
      <TopBar title="SVΛYP" />

      {/* ── Card area — overflow-visible so box-shadow is never clipped during drag ── */}
      <div
        className="flex-1 flex items-end justify-center px-4"
        style={{ paddingTop: 80, paddingBottom: 12 }}
      >
        <div className="relative w-full h-full" style={{ maxWidth: 420 }}>
          {loading ? (
            <div className="flex items-center justify-center h-full w-full">
              <div className="w-12 h-12 rounded-full border-[2.5px] border-black border-t-transparent animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'rgba(0,0,0,0.45)' }}>
              <p className="text-sm">{error}</p>
              <button className="text-xs underline" onClick={() => router.reload()}>Retry</button>
            </div>
          ) : currentIndex >= products.length ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="text-4xl">✨</div>
              <p className="text-base font-semibold">You&apos;re all caught up!</p>
              <p className="text-sm" style={{ color: 'rgba(0,0,0,0.4)' }}>Check back later for new arrivals</p>
              <button
                className="mt-4 px-6 py-3 rounded-2xl bg-black text-white text-sm font-semibold"
                onClick={() => { setCurrentIndex(0); setHistory([]); }}
              >
                Start over
              </button>
            </div>
          ) : (
            <>
              {[2, 1, 0].map((offset) => {
                const idx = currentIndex + offset;
                if (idx >= products.length) return null;
                return (
                  <SwipeCard
                    key={products[idx].id}
                    product={products[idx]}
                    stackIndex={offset}
                    dragProgress={dragProgress}
                    onDragProgress={offset === 0 ? setDragProgress : () => {}}
                    onSwipeLeft={offset === 0 ? handleSwipeLeft : () => {}}
                    onSwipeRight={offset === 0 ? handleSwipeRight : () => {}}
                    onSwipeUp={offset === 0 ? handleSwipeUp : () => {}}
                    onTap={offset === 0 ? () => {
                      logAnalyticsEvent(Events.PRODUCT_DETAIL_OPENED, {
                        [Params.PRODUCT_ID]: products[idx].id,
                        [Params.SOURCE]: 'discover',
                      });
                      router.push(`/product/${products[idx].id}`);
                    } : () => {}}
                    registerTrigger={offset === 0 ? (fn) => { triggerTopSwipe.current = fn; } : undefined}
                  />
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Action buttons — bottom, z-index above cards so swipe-exit never covers them ── */}
      {!loading && !error && currentIndex < products.length && (
        <div
          className="shrink-0 px-4"
          style={{
            paddingBottom: 'calc(92px + env(safe-area-inset-bottom, 0px))',
            position: 'relative',
            zIndex: 20,
          }}
        >
          <div
            className="flex items-center gap-3 px-4 py-2.5 mx-auto"
            style={{
              maxWidth: 420,
              background: 'rgba(255,255,255,0.80)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 36,
              border: '0.5px solid rgba(0,0,0,0.16)',
              boxShadow: '0 8px 24px -2px rgba(0,0,0,0.12)',
            }}
          >
            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
              style={{ border: '1px solid rgba(0,0,0,0.16)', background: 'rgba(0,0,0,0.04)' }}
              aria-label="Undo"
            >
              <RotateCcw size={20} strokeWidth={1.8} />
            </button>

            {/* Dislike */}
            <button
              onClick={() => triggerTopSwipe.current?.('left')}
              className="flex-1 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'white', border: '1px solid rgba(0,0,0,0.20)' }}
              aria-label="Dislike"
            >
              <ThumbsDown size={22} strokeWidth={1.8} />
            </button>

            {/* Like */}
            <button
              onClick={() => triggerTopSwipe.current?.('right')}
              className="flex-1 h-14 rounded-full flex items-center justify-center"
              style={{ background: '#000' }}
              aria-label="Like"
            >
              <Heart size={22} strokeWidth={2} color="white" fill="white" />
            </button>
          </div>
        </div>
      )}

      {/* ── Size/Color bottom sheet for swipe-up ── */}
      {cartProduct && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setCartProduct(null)}>
          <div
            className="px-6 pt-5 pb-8 rounded-t-[28px]"
            style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
            <h2 className="text-lg font-bold mb-5">Select Size &amp; Color</h2>

            {cartProduct.sizes && cartProduct.sizes.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Size</p>
                <div className="flex flex-wrap gap-2">
                  {cartProduct.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s === selectedSize ? '' : s)}
                      className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-xl text-sm font-medium border transition-colors"
                      style={{
                        background: selectedSize === s ? '#000' : 'rgba(0,0,0,0.04)',
                        color: selectedSize === s ? '#fff' : '#000',
                        border: selectedSize === s ? '1px solid transparent' : '1px solid rgba(0,0,0,0.13)',
                      }}
                    >
                      {s.startsWith('SIZE_') ? s.slice(5) : s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cartProduct.colors && cartProduct.colors.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Color</p>
                <div className="flex flex-wrap gap-2">
                  {cartProduct.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c === selectedColor ? '' : c)}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                      style={{
                        background: selectedColor === c ? '#000' : 'rgba(0,0,0,0.04)',
                        color: selectedColor === c ? '#fff' : '#000',
                        border: selectedColor === c ? '1px solid transparent' : '1px solid rgba(0,0,0,0.13)',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleCartConfirm}
              className="w-full py-4 rounded-2xl text-sm font-semibold transition-opacity"
              style={{
                background: '#000', color: '#fff',
                opacity: (!cartProduct.sizes?.length || selectedSize) && (!cartProduct.colors?.length || selectedColor) ? 1 : 0.4,
              }}
            >
              <ShoppingBag size={16} className="inline mr-2 -mt-0.5" />
              Add to Cart
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom nav ── */}
      <BottomNav />
    </div>
  );
}

