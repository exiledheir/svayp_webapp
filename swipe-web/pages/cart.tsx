import { needsUnoptimized } from '@/lib/img';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ShoppingCart, Minus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { getCartItems, removeFromCart, updateQuantity, clearCart, formatPrice } from '@/lib/cart-storage';
import type { CartItem } from '@/lib/cart-storage';

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => setItems(getCartItems()), []);

  function refresh() { setItems(getCartItems()); }

  function handleRemove(cartId: string) {
    removeFromCart(cartId);
    refresh();
  }

  function handleQty(cartId: string, delta: number) {
    const item = items.find((i) => i.cartId === cartId);
    if (!item) return;
    if (item.quantity + delta < 1) { handleRemove(cartId); return; }
    updateQuantity(cartId, item.quantity + delta);
    refresh();
  }

  function handleClearAll() {
    clearCart();
    setItems([]);
  }

  const total = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const currency = items[0]?.currency ?? 'UZS';
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

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
          <span className="flex-1 text-[17px] font-bold tracking-[-0.3px]">Cart</span>
          {items.length > 0 && (
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center"
              onClick={handleClearAll}
              aria-label="Clear cart"
            >
              <Trash2 size={18} color="#FF3B30" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingTop: 72, paddingBottom: items.length > 0 ? 'calc(140px + env(safe-area-inset-bottom, 0px))' : 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 mt-24">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.05)' }}
            >
              <ShoppingCart size={28} strokeWidth={1.5} color="rgba(0,0,0,0.3)" />
            </div>
            <p className="text-[15px] font-semibold" style={{ color: '#000' }}>Your cart is empty</p>
            <p className="text-[13px]" style={{ color: 'rgba(0,0,0,0.45)' }}>Swipe up on products to add them</p>
            <button
              className="mt-2 px-6 py-2.5 rounded-2xl text-[13px] font-semibold text-white"
              style={{ background: '#000' }}
              onClick={() => router.push('/discover')}
            >
              Discover products
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            {items.map((item, idx) => (
              <div key={item.cartId}>
                <div className="flex gap-3 px-4 py-4">
                  {/* Image */}
                  <div
                    className="shrink-0 overflow-hidden relative"
                    style={{ width: 80, height: 106, borderRadius: 12, background: '#F7F7F8' }}
                    onClick={() => router.push(`/product/${item.productId}`)}
                  >
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover cursor-pointer"
                        unoptimized={needsUnoptimized(item.imageUrl)}
                      />
                    ) : null}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <p className="text-[11px] truncate" style={{ color: 'rgba(0,0,0,0.45)' }}>{item.brand}</p>
                      <p
                        className="text-[13px] font-medium leading-snug cursor-pointer"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: '#000' }}
                        onClick={() => router.push(`/product/${item.productId}`)}
                      >
                        {item.title}
                      </p>
                      {(item.selectedSize || item.selectedColor) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.selectedSize && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.6)' }}>
                              {item.selectedSize}
                            </span>
                          )}
                          {item.selectedColor && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.6)' }}>
                              {item.selectedColor}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[15px] font-bold" style={{ color: '#000' }}>{formatPrice(item.price * item.quantity, item.currency)}</p>
                      {/* Qty stepper + delete */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQty(item.cartId, -1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ border: '1px solid rgba(0,0,0,0.18)' }}
                        >
                          {item.quantity === 1 ? <Trash2 size={12} color="rgba(0,0,0,0.5)" /> : <Minus size={12} />}
                        </button>
                        <span className="text-[13px] font-semibold w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleQty(item.cartId, 1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: '#000' }}
                        >
                          <Plus size={12} color="white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {idx < items.length - 1 && (
                  <div className="mx-4" style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />
                )}
              </div>
            ))}

            {/* last divider */}
            <div className="mx-4" style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />
          </div>
        )}
      </div>

      {/* ── Checkout button (sticky bottom) ── */}
      {items.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 px-4 pt-3"
          style={{
            paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: '0.5px solid rgba(0,0,0,0.10)',
          }}
        >
          <div className="flex items-center justify-between px-1 mb-3">
            <span className="text-[14px]" style={{ color: 'rgba(0,0,0,0.5)' }}>Total</span>
            <span className="text-[17px] font-bold" style={{ color: '#000' }}>{formatPrice(total, currency)}</span>
          </div>
          <button
            className="w-full py-4 rounded-2xl text-[15px] font-bold text-white"
            style={{ background: '#000' }}
            onClick={() => router.push('/checkout')}
          >
            Checkout
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
