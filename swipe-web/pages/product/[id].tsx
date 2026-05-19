import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, Heart, ShoppingCart, Check, ChevronRight, MapPin, Phone, Store, Minus, Plus, X, MessageCircle } from 'lucide-react';
import { getProductById, getSellerInfo, createChat, sendChatMessage } from '@/lib/api';
import { isLiked, toggleLiked } from '@/lib/liked-storage';
import { addToCart, getCartItems, formatPrice } from '@/lib/cart-storage';
import type { Product, SellerInfo, SellerLocation } from '@/types';

/** Returns true if the string is a CSS hex color (#RGB or #RRGGBB). */
function isHexColor(s: string) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(s.trim());
}

/**
 * Heuristic: is this color visually "light" so we need a visible border?
 * Covers known light CSS names + light hex values.
 */
function isLightColor(s: string): boolean {
  const light = ['white', 'ivory', 'cream', 'beige', 'snow', 'linen', 'seashell', 'lightyellow', 'lightcyan', 'mintcream', 'honeydew', 'aliceblue', 'lavenderblush', 'mistyrose', 'lavender', 'ghostwhite', 'floralwhite', 'oldlace', 'whitesmoke'];
  const lower = s.toLowerCase().trim();
  if (light.some((l) => lower === l || lower.includes(l))) return true;
  if (isHexColor(s)) {
    const hex = s.replace('#', '');
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    // luminance > 0.8 → treat as light
    return (r * 299 + g * 587 + b * 114) / 1000 > 200;
  }
  return false;
}

export default function ProductDetailPage() {
  const router = useRouter();
  const id = router.query.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => { setCartCount(getCartItems().reduce((s, i) => s + i.quantity, 0)); }, []);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [mapSheetLoc, setMapSheetLoc] = useState<SellerLocation | null>(null);
  const [showComposeSheet, setShowComposeSheet] = useState(false);
  const [composeMessage, setComposeMessage] = useState('Hi, do you have this product in stock?');
  const [composeSending, setComposeSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getProductById(id)
      .then((p) => {
        setProduct(p);
        setLiked(isLiked(p.id));
        if (p.sellerId) {
          getSellerInfo(p.sellerId).then(setSellerInfo).catch(() => {});
        }
      })
      .catch(() => setError('Failed to load product'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleLike() {
    if (!product) return;
    const newState = toggleLiked({
      productId: product.id, title: product.title, brand: product.brand,
      price: product.price, currency: product.currency, imageUrl: product.images[0] ?? '',
    });
    setLiked(newState);
  }

  function handleAddToCart() {
    if (!product) return;
    addToCart({
      productId: product.id, title: product.title, brand: product.brand,
      price: product.price, currency: product.currency, imageUrl: product.images[0] ?? '',
      selectedSize: selectedSize || undefined, selectedColor: selectedColor || undefined, quantity,
    });
    setCartCount(getCartItems().reduce((s, i) => s + i.quantity, 0));
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  function handleImageScroll() {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
    setSelectedImage(idx);
  }

  function scrollToImage(i: number) {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: i * scrollRef.current.offsetWidth, behavior: 'smooth' });
    setSelectedImage(i);
  }

  const locations = sellerInfo?.locations ?? [];

  return (
    <div className="phone-container flex flex-col bg-white" style={{ height: '100dvh', overflow: 'hidden' }}>

      {/* ── Map picker sheet ── */}
      {mapSheetLoc && <MapSheet loc={mapSheetLoc} onClose={() => setMapSheetLoc(null)} />}

      {/* ── Chat compose sheet ── */}
      {showComposeSheet && product && (
        <ChatComposeSheet
          product={product}
          sellerInfo={sellerInfo}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          quantity={quantity}
          message={composeMessage}
          onMessageChange={setComposeMessage}
          sending={composeSending}
          onSend={async () => {
            if (!product.sellerId) return;
            setComposeSending(true);
            try {
              const chat = await createChat({
                sellerId: product.sellerId,
                productId: product.id,
                color: selectedColor || undefined,
                size: selectedSize || undefined,
                quantity,
                subject: `${product.brand} - ${product.title}`,
              });
              await sendChatMessage(chat.id, composeMessage);
              setShowComposeSheet(false);
              router.push({
                pathname: `/chat/${chat.id}`,
                query: {
                  productTitle: product.title,
                  productBrand: product.brand,
                  productImage: product.images[0] ?? '',
                  productPrice: product.price,
                  productCurrency: product.currency,
                  selectedColor: selectedColor || '',
                  selectedSize: selectedSize || '',
                  quantity: quantity,
                  sellerName: sellerInfo?.name ?? product.brand,
                  sellerLogo: sellerInfo?.logoImg ?? '',
                },
              });
            } catch {
              setComposeSending(false);
            }
          }}
          onClose={() => setShowComposeSheet(false)}
        />
      )}

      {/* ── Add-to-cart toast ── */}
      <div
        className="absolute inset-x-0 z-[60] pointer-events-none px-4"
        style={{
          top: 72,
          transform: added ? 'translateY(0)' : 'translateY(-16px)',
          opacity: added ? 1 : 0,
          transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease',
        }}
      >
        <div
          className="flex items-center gap-3 px-3 py-2.5"
          style={{
            background: 'rgba(20,20,20,0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          }}
        >
          {product?.images?.[0] && (
            <div className="shrink-0 overflow-hidden" style={{ width: 36, height: 36, borderRadius: 8, background: '#333' }}>
              <img src={product.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white leading-tight truncate">{product?.title}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Added to cart</p>
          </div>
          <div
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <Check size={14} strokeWidth={2.5} color="white" />
          </div>
        </div>
      </div>

      {/* ── Floating nav buttons ── */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-start justify-between px-4 pt-3 pointer-events-none">
        {/* Back — standalone circle */}
        <button
          className="w-11 h-11 flex items-center justify-center pointer-events-auto"
          style={{
            background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)', borderRadius: '50%',
            border: '0.5px solid rgba(0,0,0,0.14)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
          onClick={() => router.back()} aria-label="Back"
        >
          <ArrowLeft size={20} strokeWidth={1.8} />
        </button>

        {/* Heart + Cart — pill */}
        <div
          className="flex items-center pointer-events-auto"
          style={{
            background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)', borderRadius: 22,
            border: '0.5px solid rgba(0,0,0,0.14)', padding: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <button className="w-10 h-10 flex items-center justify-center" onClick={handleLike} aria-label="Like">
            <Heart size={20} strokeWidth={1.8} fill={liked ? '#000' : 'none'} color="#000" />
          </button>
          <button className="relative w-10 h-10 flex items-center justify-center" onClick={() => router.push('/cart')} aria-label="Cart">
            <ShoppingCart size={20} strokeWidth={1.8} />
            {cartCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                style={{ background: '#FF3B30', lineHeight: 1, padding: '0 3px' }}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-[2.5px] border-black border-t-transparent animate-spin" />
        </div>
      ) : error || !product ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: 'rgba(0,0,0,0.4)' }}>
          <p className="text-sm">{error || 'Product not found'}</p>
          <button className="text-xs underline" onClick={() => router.back()}>Go back</button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">

            {/* ── Image carousel ── */}
            <div className="relative">
              <div
                ref={scrollRef}
                className="flex overflow-x-auto"
                style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
                onScroll={handleImageScroll}
              >
                {(product.images.length > 0 ? product.images : ['']).map((img, i) => (
                  <div key={i} className="relative shrink-0 w-full" style={{ aspectRatio: '4/5', scrollSnapAlign: 'start', background: '#F7F7F8' }}>
                    {img ? (
                      <Image src={img} alt={product.title} fill className="object-cover" unoptimized priority={i === 0} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[13px]" style={{ color: 'rgba(0,0,0,0.3)' }}>No image</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Dot indicators */}
              {product.images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {product.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => scrollToImage(i)}
                      className="rounded-full transition-all"
                      style={{ width: i === selectedImage ? 16 : 6, height: 6, background: i === selectedImage ? 'white' : 'rgba(255,255,255,0.55)' }}
                    />
                  ))}
                </div>
              )}

              {/* Discount badge */}
              {(product.discountPercentage ?? 0) > 0 && (
                <span className="absolute top-14 left-4 text-white text-[11px] font-bold px-2 py-1 rounded-lg" style={{ background: '#FF3B30' }}>
                  -{product.discountPercentage}%
                </span>
              )}
            </div>

            {/* ── Info section ── */}
            <div className="px-4 pt-5 pb-4">
              <p className="text-[12px] font-medium uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.45)' }}>
                {product.brand}
              </p>
              <h1 className="text-[18px] font-bold leading-snug tracking-[-0.3px]" style={{ color: '#000' }}>
                {product.title}
              </h1>
              <div className="flex items-baseline gap-2.5 mt-3">
                <span className="text-[22px] font-bold tracking-[-0.5px]" style={{ color: '#000' }}>
                  {formatPrice(product.price, product.currency)}
                </span>
                {(product.originalPrice ?? 0) > product.price && (
                  <span className="text-[15px] line-through" style={{ color: 'rgba(0,0,0,0.35)' }}>
                    {formatPrice(product.originalPrice!, product.currency)}
                  </span>
                )}
              </div>
            </div>

            <div className="mx-4" style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />

            {/* ── Sizes ── */}
            {(product.sizes?.length ?? 0) > 0 && (
              <div className="px-4 pt-4 pb-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgba(0,0,0,0.45)' }}>Size</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes!.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s === selectedSize ? '' : s)}
                      className="min-w-[44px] h-11 px-3 rounded-xl text-[13px] font-semibold transition-colors"
                      style={{
                        background: selectedSize === s ? '#000' : 'white',
                        color: selectedSize === s ? 'white' : '#000',
                        border: `1.5px solid ${selectedSize === s ? '#000' : 'rgba(0,0,0,0.13)'}`,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Colors ── */}
            {(product.colors?.length ?? 0) > 0 && (
              <div className="px-4 pt-1 pb-4">
                <p className="text-[12px] font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgba(0,0,0,0.45)' }}>Color</p>
                <div className="flex flex-wrap gap-4">
                  {product.colors!.map((c) => {
                    const isSelected = selectedColor === c;
                    const light = isLightColor(c);
                    const label = isHexColor(c) ? '' : c;
                    return (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c === selectedColor ? '' : c)}
                        className="flex flex-col items-center gap-1.5"
                        aria-label={label || c}
                      >
                        <div
                          className="flex items-center justify-center transition-all"
                          style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: c,
                            border: isSelected
                              ? '2.5px solid #000'
                              : light
                              ? '1.5px solid rgba(0,0,0,0.20)'
                              : '1.5px solid transparent',
                            boxShadow: isSelected ? '0 0 0 2px white inset' : undefined,
                          }}
                        >
                          {isSelected && !light && (
                            <Check size={14} strokeWidth={2.5} color="white" />
                          )}
                          {isSelected && light && (
                            <Check size={14} strokeWidth={2.5} color="#000" />
                          )}
                        </div>
                        {label && (
                          <span className="text-[11px] font-medium max-w-[52px] text-center leading-tight truncate" style={{ color: isSelected ? '#000' : 'rgba(0,0,0,0.55)' }}>
                            {label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Quantity ── */}
            <div className="px-4 pb-4">
              <p className="text-[12px] font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgba(0,0,0,0.45)' }}>Quantity</p>
              <div className="flex items-center gap-0" style={{ display: 'inline-flex', border: '1.5px solid rgba(0,0,0,0.13)', borderRadius: 14, overflow: 'hidden' }}>
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 flex items-center justify-center active:bg-gray-100 transition-colors"
                  style={{ color: quantity === 1 ? 'rgba(0,0,0,0.25)' : '#000' }}
                  disabled={quantity === 1}
                >
                  <Minus size={16} strokeWidth={2} />
                </button>
                <span className="w-10 text-center text-[15px] font-bold" style={{ color: '#000' }}>{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-11 h-11 flex items-center justify-center active:bg-gray-100 transition-colors"
                >
                  <Plus size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="mx-4" style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />

            {/* ── Description ── */}
            {product.description && (
              <div className="px-4 py-4">
                <p className="text-[12px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgba(0,0,0,0.45)' }}>Description</p>
                <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(0,0,0,0.65)' }}>{product.description}</p>
              </div>
            )}

            {product.description && (
              <div className="mx-4" style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />
            )}

            {/* ── Product Details ── */}
            <div className="px-4 py-4">
              <p className="text-[15px] font-bold mb-3" style={{ color: '#000' }}>Product Details</p>
              <div
                className="overflow-hidden"
                style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,0.09)' }}
              >
                {[
                  { label: 'Brand', value: product.brand },
                  product.sizes && product.sizes.length > 0 ? { label: 'Available Sizes', value: product.sizes.join(', ') } : null,
                  product.colors && product.colors.length > 0 ? { label: 'Colors', value: `${product.colors.length} option${product.colors.length > 1 ? 's' : ''}` } : null,
                  { label: 'In Stock', value: product.inStock ? 'Yes' : 'No' },
                  product.rating ? { label: 'Rating', value: `${product.rating.toFixed(1)} / 5` } : null,
                  (product.discountPercentage ?? 0) > 0 ? { label: 'Discount', value: `-${product.discountPercentage}%` } : null,
                ].filter(Boolean).map((row, i, arr) => (
                  <div
                    key={row!.label}
                    className="flex items-center px-4"
                    style={{
                      height: 44,
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    <span className="flex-1 text-[13px]" style={{ color: 'rgba(0,0,0,0.5)' }}>{row!.label}</span>
                    <span className="text-[13px] font-medium" style={{ color: '#000' }}>{row!.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Where to Buy ── */}
            {(locations.length > 0 || product.sellerId) && (
              <div className="pb-2">
                <p className="px-4 pb-2 text-[15px] font-bold" style={{ color: '#000' }}>Where to Buy</p>

                {/* Seller shop — shown after heading, before location maps */}
                {product.sellerId && (
                  <>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3"
                      onClick={() => router.push(`/seller/${product.sellerId}`)}
                    >
                      {sellerInfo?.logoImg ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden relative shrink-0" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                          <Image src={sellerInfo.logoImg} alt={sellerInfo.name} fill sizes="40px" className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[15px] font-bold" style={{ background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.5)' }}>
                          {(sellerInfo?.name ?? product.brand)?.[0]?.toUpperCase() ?? 'S'}
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="text-[13px] font-semibold" style={{ color: '#000' }}>{sellerInfo?.name ?? product.brand}</p>
                        <p className="text-[11px]" style={{ color: 'rgba(0,0,0,0.45)' }}>View shop</p>
                      </div>
                      <ChevronRight size={16} strokeWidth={1.8} color="rgba(0,0,0,0.3)" />
                    </button>
                    {locations.length > 0 && <div className="mx-4 mb-2" style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />}
                  </>
                )}

                {/* Location cards with map previews */}
                {locations.map((loc, i) => (
                  <LocationCard key={i} loc={loc} onOpenMap={() => setMapSheetLoc(loc)} />
                ))}
              </div>
            )}

            {/* Spacer for bottom bar */}
            <div style={{ height: 120 }} />
          </div>

          {/* ── Bottom bar ── */}
          <div
            className="absolute bottom-0 left-0 right-0 px-4 pt-3 flex flex-col gap-2"
            style={{
              paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderTop: '0.5px solid rgba(0,0,0,0.10)',
            }}
          >
            <div className="flex gap-3">
              {/* Check Availability */}
              <button
                onClick={() => { if (product.sellerId) setShowComposeSheet(true); }}
                className="flex-1 flex items-center justify-center gap-1.5 text-[14px] font-semibold transition-transform active:scale-[0.98]"
                style={{ height: 50, borderRadius: 14, background: 'white', color: '#000', border: '1.5px solid rgba(0,0,0,0.18)' }}
              >
                <MessageCircle size={15} strokeWidth={2} />
                Check Availability
              </button>
              {/* Add to cart */}
              <button
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-1.5 text-[14px] font-bold transition-transform active:scale-[0.98]"
                style={{ height: 50, borderRadius: 14, background: '#000', color: 'white' }}
              >
                {added ? <><Check size={16} strokeWidth={2.2} /> Added!</> : <><ShoppingCart size={16} strokeWidth={2.2} /> Add to Cart</>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── ChatComposeSheet ─────────────────────────────────────────────────────────

function ChatComposeSheet({
  product, sellerInfo, selectedColor, selectedSize, quantity,
  message, onMessageChange, sending, onSend, onClose,
}: {
  product: Product; sellerInfo: SellerInfo | null;
  selectedColor: string; selectedSize: string; quantity: number;
  message: string; onMessageChange: (v: string) => void;
  sending: boolean; onSend: () => void; onClose: () => void;
}) {
  const sellerInitial = (sellerInfo?.name ?? product.brand)?.[0]?.toUpperCase() ?? 'S';
  return (
    <div
      className="absolute inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div className="flex-1" onClick={onClose} />
      <div
        className="flex flex-col"
        style={{ background: 'white', borderRadius: '22px 22px 0 0', maxHeight: '90dvh', overflow: 'hidden' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            {sellerInfo?.logoImg ? (
              <div className="w-9 h-9 rounded-full overflow-hidden relative shrink-0" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                <Image src={sellerInfo.logoImg} alt={sellerInfo.name} fill sizes="36px" className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[14px] font-bold" style={{ background: '#000', color: 'white' }}>
                {sellerInitial}
              </div>
            )}
            <span className="text-[15px] font-bold" style={{ color: '#000' }}>{sellerInfo?.name ?? product.brand}</span>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center">
            <X size={20} strokeWidth={1.8} color="rgba(0,0,0,0.4)" />
          </button>
        </div>

        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />

        <div className="flex-1 overflow-y-auto">
          {/* Product card */}
          <div className="mx-4 mt-4 p-3 flex gap-3" style={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.09)' }}>
            {product.images[0] && (
              <div className="relative shrink-0 rounded-lg overflow-hidden" style={{ width: 64, height: 85, background: '#F7F7F8' }}>
                <Image src={product.images[0]} alt={product.title} fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase" style={{ color: 'rgba(0,0,0,0.45)' }}>{product.brand}</p>
              <p className="text-[13px] font-semibold mt-0.5 leading-snug line-clamp-2" style={{ color: '#000' }}>{product.title}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedColor && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.65)' }}>
                    {selectedColor}
                  </span>
                )}
                {selectedSize && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.65)' }}>
                    Size {selectedSize}
                  </span>
                )}
                {quantity > 1 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.65)' }}>
                    Qty {quantity}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Message input */}
          <div className="mx-4 mt-3 mb-4 p-3" style={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.09)' }}>
            <textarea
              className="w-full resize-none text-[14px] leading-relaxed outline-none"
              style={{ minHeight: 96, color: '#000', background: 'transparent' }}
              placeholder="Type your message..."
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Send button */}
        <div className="px-4 py-3" style={{ borderTop: '0.5px solid rgba(0,0,0,0.10)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <button
            onClick={onSend}
            disabled={sending || !message.trim()}
            className="w-full flex items-center justify-center gap-2 text-[15px] font-bold transition-all active:scale-[0.98]"
            style={{ height: 50, borderRadius: 14, background: sending || !message.trim() ? 'rgba(0,0,0,0.3)' : '#000', color: 'white' }}
          >
            {sending ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <><MessageCircle size={17} strokeWidth={2} /> Send Message</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MapSheet ──────────────────────────────────────────────────────────────────

function MapSheet({ loc, onClose }: { loc: SellerLocation; onClose: () => void }) {
  const hasCoords = loc.latitude != null && loc.longitude != null;

  function googleUrl() {
    if (hasCoords) return `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address ?? '')}`;
  }
  function appleUrl() {
    if (hasCoords) return `https://maps.apple.com/?ll=${loc.latitude},${loc.longitude}&q=${loc.latitude},${loc.longitude}`;
    return `https://maps.apple.com/?q=${encodeURIComponent(loc.address ?? '')}`;
  }
  function yandexUrl() {
    if (hasCoords) return `https://yandex.com/maps/?pt=${loc.longitude},${loc.latitude}&z=15&l=map`;
    return `https://yandex.com/maps/?text=${encodeURIComponent(loc.address ?? '')}`;
  }

  return (
    <div
      className="absolute inset-0 z-[100] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="px-5 pt-4 pb-8"
        style={{ background: 'white', borderRadius: '22px 22px 0 0' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(0,0,0,0.13)' }} />
        <p className="text-[15px] font-semibold mb-1">Open in Maps</p>
        {loc.address && <p className="text-[12px] mb-4 truncate" style={{ color: 'rgba(0,0,0,0.45)' }}>{loc.address}</p>}

        <a href={googleUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-3.5" onClick={onClose}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
              <path fill="#4285F4" d="M45.5 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h12.1c-.5 2.7-2.1 5-4.4 6.5v5.4h7.1c4.2-3.8 6.7-9.5 6.7-15.6z"/>
              <path fill="#34A853" d="M24 46c6.1 0 11.2-2 14.9-5.4l-7.1-5.4c-2 1.3-4.5 2.1-7.8 2.1-6 0-11.1-4-12.9-9.5H3.7v5.6C7.4 41.5 15.1 46 24 46z"/>
              <path fill="#FBBC05" d="M11.1 27.8A13.9 13.9 0 0 1 11.1 20.2v-5.6H3.7A22 22 0 0 0 2 24c0 3.5.8 6.9 2.3 9.8l7.4-5.6-.6-.4z"/>
              <path fill="#EA4335" d="M24 10.1c3.4 0 6.4 1.2 8.8 3.4l6.5-6.5C35.2 3.2 30 1 24 1 15.1 1 7.4 5.5 3.7 12.4l7.4 5.6C13 12.1 18 8.1 24 8.1z"/>
            </svg>
          </div>
          <span className="text-[15px] font-medium">Google Maps</span>
        </a>
        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />

        <a href={appleUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-3.5" onClick={onClose}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#1C1C1E' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
          </div>
          <span className="text-[15px] font-medium">Apple Maps</span>
        </a>
        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />

        <a href={yandexUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-3.5" onClick={onClose}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FC3F1D' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M14.341 21h-2.48V13.08H10.5L6.66 21H4l4.08-8.2C6.11 12.1 4.87 10.5 4.87 8.1 4.87 5.02 6.95 3 10.44 3H14.34V21zm-2.48-9.88V5.02h-1.17c-1.97 0-3.14 1.05-3.14 3.06 0 1.94 1.05 3.04 3.06 3.04h1.25z"/>
            </svg>
          </div>
          <span className="text-[15px] font-medium">Yandex Maps</span>
        </a>
      </div>
    </div>
  );
}

// ── LocationCard ──────────────────────────────────────────────────────────────

function LocationCard({ loc, onOpenMap }: { loc: SellerLocation; onOpenMap: () => void }) {
  const hasPhone = loc.phoneNumber && loc.phoneNumber.length > 0;
  const hasAddress = loc.address && loc.address.length > 0;
  const canOpenMap = hasAddress || (loc.latitude != null && loc.longitude != null);

  return (
    <div className="mx-3 mb-2.5 overflow-hidden" style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,0.09)' }}>
      {/* Yandex Static Map preview — mirrors Flutter MapPreviewCard using static-maps.yandex.ru */}
      {(loc.latitude != null && loc.longitude != null) && (
        <div
          className="w-full relative overflow-hidden cursor-pointer"
          style={{ height: 130, background: '#E9EAF0' }}
          onClick={() => canOpenMap && onOpenMap()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://static-maps.yandex.ru/1.x/?ll=${loc.longitude},${loc.latitude}&z=15&size=600,300&l=map&pt=${loc.longitude},${loc.latitude},pm2rdm`}
            alt="Map preview"
            className="w-full h-full object-cover pointer-events-none"
          />
          {/* Bottom gradient */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.22))' }} />
          {/* "Open map" badge — top right */}
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.65)' }}>
            <MapPin size={11} strokeWidth={2} color="white" />
            <span className="text-[11px] font-semibold" style={{ color: 'white' }}>Open map</span>
          </div>
          {/* Red pin centred */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: 14 }}>
            <MapPin size={30} strokeWidth={2} color="#FC3F1D" fill="#FC3F1D" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))' }} />
          </div>
        </div>
      )}

      <div className="p-4">
        {loc.name && (
          <div className="flex items-center gap-2 mb-2">
            <Store size={14} strokeWidth={1.8} color="rgba(0,0,0,0.5)" />
            <p className="text-[13px] font-semibold" style={{ color: '#000' }}>{loc.name}</p>
            {loc.isPrimary && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#000', color: '#fff' }}>Main</span>
            )}
          </div>
        )}
        {hasAddress && (
          <button className="flex items-start gap-2 w-full text-left" onClick={() => canOpenMap && onOpenMap()}>
            <MapPin size={14} strokeWidth={1.8} color={canOpenMap ? '#000' : 'rgba(0,0,0,0.4)'} className="shrink-0 mt-0.5" />
            <p className="text-[13px] underline" style={{ color: '#000' }}>{loc.address}</p>
          </button>
        )}
        {hasPhone && (
          <a href={`tel:${loc.phoneNumber}`} className="flex items-center gap-2 mt-2">
            <Phone size={14} strokeWidth={1.8} color="rgba(0,0,0,0.4)" />
            <span className="text-[13px] underline" style={{ color: '#000' }}>{loc.phoneNumber}</span>
          </a>
        )}
      </div>
    </div>
  );
}


