import React from 'react';
import { useRouter } from 'next/router';
import { Compass, Search, Camera, Send, Shirt, Heart, ShoppingCart } from 'lucide-react';

// Maps display slot (0-4) → tab route; slot 2 is center VS button (no route)
const SLOTS = [
  { href: '/discover', icon: Compass, label: 'SVΛYP',      isCenter: false },
  { href: '/shop',     icon: Search,  label: 'Shop',        isCenter: false },
  { href: null,        icon: Camera,  label: 'AI Search',   isCenter: true  },
  { href: '/chat',     icon: Send,    label: 'Chat',        isCenter: false },
  { href: '/closet',   icon: Shirt,   label: 'Closet',      isCenter: false },
];

// Returns the display slot (0,1,3,4) that should be "active", or -1 if none
function useActiveSlot(path: string): number {
  if (path === '/' || path.startsWith('/discover')) return 0;
  if (path.startsWith('/shop'))    return 1;
  if (path.startsWith('/chat'))    return 3;
  if (path.startsWith('/closet'))  return 4;
  return -1;
}

export default function BottomNav() {
  const router = useRouter();
  const activeSlot = useActiveSlot(router.pathname);

  return (
    // Fixed, centred, capped at phone width — matches Flutter's left:28/right:28 pill
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{
        padding: '8px 28px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* ── Floating glass pill ── */}
      <div
        className="relative flex items-center h-[60px]"
        style={{
          background: 'rgba(255,255,255,0.73)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 40,
          border: '0.8px solid rgba(255,255,255,0.33)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        {/* ── Sliding dark indicator (matches Flutter spring animation) ── */}
        {activeSlot >= 0 && (
          <div
            className="absolute top-[7px] bottom-[7px] pointer-events-none"
            style={{
              left: `calc(${activeSlot * 20}% + 4px)`,
              width: 'calc(20% - 8px)',
              background: 'linear-gradient(135deg, rgba(0,0,0,0.24), rgba(0,0,0,0.13))',
              borderRadius: 22,
              border: '0.8px solid rgba(255,255,255,0.4)',
              transition: 'left 0.32s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          />
        )}

        {/* ── Tab items ── */}
        {SLOTS.map((slot, i) => {
          const Icon = slot.icon;
          const isActive = activeSlot === i;
          const color = isActive ? '#000' : 'rgba(0,0,0,0.45)';

          if (slot.isCenter) {
            // Visual Search — pulsing gradient circle matching Flutter _VisualSearchNavButton
            return (
              <button
                key={i}
                className="relative z-10 flex-1 flex flex-col items-center justify-center gap-[3px] py-1"
                onClick={() => { /* Visual search — not yet implemented */ }}
                aria-label="AI Visual Search"
              >
                <div
                  className="w-[34px] h-[34px] rounded-full flex items-center justify-center vs-pulse"
                  style={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #F5576c 100%)',
                  }}
                >
                  <Camera size={17} strokeWidth={2} color="white" />
                </div>
                <span className="text-[9.5px]" style={{ color: 'rgba(0,0,0,0.45)', fontWeight: 400 }}>
                  {slot.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={i}
              className="relative z-10 flex-1 flex flex-col items-center justify-center gap-0.5 py-1"
              onClick={() => slot.href && router.push(slot.href)}
              aria-label={slot.label}
            >
              <Icon size={21} strokeWidth={isActive ? 2.4 : 1.6} color={color} />
              <span
                className="text-[9.5px]"
                style={{ color, fontWeight: isActive ? 600 : 400 }}
              >
                {slot.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Top bar used on main screens (title + cart + liked icons)
export function TopBar({
  title,
  showCartLiked = true,
}: {
  title: string;
  showCartLiked?: boolean;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200 px-4 h-14 flex items-center justify-between">
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      {showCartLiked && (
        <div className="flex gap-3">
          <button onClick={() => router.push('/liked')} aria-label="Liked">
            <Heart size={20} strokeWidth={1.8} />
          </button>
          <button onClick={() => router.push('/cart')} aria-label="Cart">
            <ShoppingCart size={20} strokeWidth={1.8} />
          </button>
        </div>
      )}
    </header>
  );
}
