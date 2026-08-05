import { needsUnoptimized } from '@/lib/img';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, Store, CreditCard, ShoppingBag, CheckCircle, ChevronRight } from 'lucide-react';
import { getCartItems, formatPrice, removeFromCart } from '@/lib/cart-storage';
import { placeOrder } from '@/lib/api';
import type { CartItem } from '@/lib/cart-storage';

function fmtSize(s: string) {
  return s.toUpperCase().startsWith('SIZE_') ? s.slice(5) : s;
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-4 mb-4 overflow-hidden" style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,0.09)', background: '#fff' }}>
      <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
        {icon}
        <p className="text-[14px] font-bold" style={{ color: '#000' }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

// ── Order item row ────────────────────────────────────────────────────────────
function OrderItemRow({ item }: { item: CartItem }) {
  return (
    <div className="flex gap-3 px-4 py-3" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
      <div className="shrink-0 overflow-hidden relative" style={{ width: 72, height: 96, borderRadius: 10, background: '#F7F7F8' }}>
        {item.imageUrl && (
          <Image src={item.imageUrl} alt={item.title} fill className="object-cover" unoptimized={needsUnoptimized(item.imageUrl)} />
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-[11px]" style={{ color: 'rgba(0,0,0,0.45)' }}>{item.brand}</p>
        <p
          className="text-[13px] font-medium leading-snug mt-0.5"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: '#000' }}
        >
          {item.title}
        </p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {item.selectedSize && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.6)' }}>
              {fmtSize(item.selectedSize)}
            </span>
          )}
          {item.selectedColor && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.6)' }}>
              {item.selectedColor}
            </span>
          )}
          {item.quantity > 1 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.6)' }}>
              ×{item.quantity}
            </span>
          )}
        </div>
        <p className="text-[14px] font-bold mt-1.5" style={{ color: '#000' }}>
          {formatPrice(item.price * item.quantity, item.currency)}
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [placing, setPlacing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const cart = getCartItems();
    if (cart.length === 0) { router.replace('/cart'); return; }
    setItems(cart);
  }, [router]);

  const total = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const currency = items[0]?.currency ?? 'UZS';
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  async function handlePlaceOrder() {
    setPlacing(true);
    setError('');
    try {
      const result = await placeOrder({ deliveryMethod: 'PICKUP', paymentMethod: 'CASH' });
      // Clear local cart
      items.forEach((i) => removeFromCart(i.cartId));
      setOrderNumber(result.orderNumber);
    } catch {
      setError('Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (orderNumber) {
    return (
      <div className="phone-container flex flex-col bg-white" style={{ height: '100dvh' }}>
        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto flex flex-col items-center"
          style={{ paddingTop: 64, paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))', paddingLeft: 20, paddingRight: 20 }}
        >
          {/* Check icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mt-8 mb-5"
            style={{ background: '#000' }}
          >
            <CheckCircle size={36} strokeWidth={2} color="#fff" />
          </div>

          <p className="text-[24px] font-bold tracking-[-0.4px] text-center" style={{ color: '#000' }}>Order Placed!</p>
          <p className="text-[14px] mt-1.5 text-center" style={{ color: 'rgba(0,0,0,0.45)' }}>Your order has been confirmed</p>

          {/* Order number card */}
          <div
            className="w-full mt-6 px-4 py-4 flex items-center justify-between"
            style={{ background: '#F7F7F8', borderRadius: 16 }}
          >
            <span className="text-[13px]" style={{ color: 'rgba(0,0,0,0.45)' }}>Order number</span>
            <span className="text-[15px] font-bold" style={{ color: '#000' }}>{orderNumber}</span>
          </div>

          {/* Summary card */}
          <div className="w-full mt-3 overflow-hidden" style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.09)' }}>
            <div className="px-4 py-3.5" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              <p className="text-[14px] font-bold" style={{ color: '#000' }}>Order Summary</p>
            </div>
            <div className="px-4 py-3">
              <div className="flex justify-between py-1.5">
                <span className="text-[13px]" style={{ color: 'rgba(0,0,0,0.55)' }}>Items</span>
                <span className="text-[13px] font-semibold" style={{ color: '#000' }}>{itemCount}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[13px]" style={{ color: 'rgba(0,0,0,0.55)' }}>Delivery</span>
                <span className="text-[13px] font-semibold" style={{ color: '#34C759' }}>FREE · Pick up in store</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[13px]" style={{ color: 'rgba(0,0,0,0.55)' }}>Payment</span>
                <span className="text-[13px] font-semibold" style={{ color: '#000' }}>Cash on delivery</span>
              </div>
              <div
                className="flex justify-between py-3 mt-1"
                style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)' }}
              >
                <span className="text-[15px] font-bold" style={{ color: '#000' }}>Total</span>
                <span className="text-[16px] font-bold" style={{ color: '#000' }}>{formatPrice(total, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky bottom button */}
        <div
          className="absolute bottom-0 left-0 right-0 px-4 pt-3"
          style={{
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: '0.5px solid rgba(0,0,0,0.10)',
          }}
        >
          <button
            className="w-full py-4 rounded-2xl text-[15px] font-bold text-white"
            style={{ background: '#000' }}
            onClick={() => router.push('/discover')}
          >
            Continue shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-container flex flex-col bg-white" style={{ height: '100dvh' }}>

      {/* ── Glass header ── */}
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
          <span className="flex-1 text-[17px] font-bold tracking-[-0.3px]">Checkout</span>
          <div className="w-10" />
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingTop: 72, paddingBottom: 'calc(220px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="pt-4">

          {/* Delivery Method */}
          <SectionCard icon={<Store size={16} strokeWidth={1.8} color="rgba(0,0,0,0.6)" />} title="Delivery Method">
            <div className="flex items-center gap-3 px-4 py-3.5">
              {/* Radio bullet */}
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: '#000' }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#000' }} />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold" style={{ color: '#000' }}>Pick up in store</p>
                <p className="text-[12px]" style={{ color: 'rgba(0,0,0,0.45)' }}>Available for pickup</p>
              </div>
              <span className="text-[13px] font-bold" style={{ color: '#34C759' }}>FREE</span>
            </div>
          </SectionCard>

          {/* Payment Method */}
          <SectionCard icon={<CreditCard size={16} strokeWidth={1.8} color="rgba(0,0,0,0.6)" />} title="Payment Method">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: '#000' }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#000' }} />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold" style={{ color: '#000' }}>Cash on delivery</p>
                <p className="text-[12px]" style={{ color: 'rgba(0,0,0,0.45)' }}>Pay when you receive</p>
              </div>
            </div>
          </SectionCard>

          {/* Order Items */}
          <SectionCard
            icon={<ShoppingBag size={16} strokeWidth={1.8} color="rgba(0,0,0,0.6)" />}
            title={`Order Items (${itemCount})`}
          >
            {items.map((item) => <OrderItemRow key={item.cartId} item={item} />)}
          </SectionCard>

        </div>
      </div>

      {/* ── Sticky bottom bar ── */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pt-3"
        style={{
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '0.5px solid rgba(0,0,0,0.10)',
        }}
      >
        {error && (
          <p className="text-[12px] text-center mb-2" style={{ color: '#FF3B30' }}>{error}</p>
        )}
        <div className="mb-3">
          <div className="flex items-center justify-between px-1 py-1.5">
            <span className="text-[13px]" style={{ color: 'rgba(0,0,0,0.5)' }}>Subtotal</span>
            <span className="text-[13px] font-semibold" style={{ color: '#000' }}>{formatPrice(total, currency)}</span>
          </div>
          <div className="flex items-center justify-between px-1 py-1.5">
            <span className="text-[13px]" style={{ color: 'rgba(0,0,0,0.5)' }}>Delivery</span>
            <span className="text-[13px] font-bold" style={{ color: '#34C759' }}>FREE</span>
          </div>
          <div className="flex items-center justify-between px-1 pt-2.5 mt-1" style={{ borderTop: '0.5px solid rgba(0,0,0,0.10)' }}>
            <span className="text-[15px] font-bold" style={{ color: '#000' }}>Total</span>
            <span className="text-[17px] font-bold" style={{ color: '#000' }}>{formatPrice(total, currency)}</span>
          </div>
        </div>
        <button
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white flex items-center justify-center gap-2"
          style={{ background: placing ? 'rgba(0,0,0,0.5)' : '#000' }}
          onClick={handlePlaceOrder}
          disabled={placing}
        >
          {placing ? (
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <>Place Order · {formatPrice(total, currency)}</>
          )}
        </button>
      </div>
    </div>
  );
}
