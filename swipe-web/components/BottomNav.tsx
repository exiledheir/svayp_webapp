import React from 'react';
import { useRouter } from 'next/router';
import { Compass, Search, Camera, Send, Shirt, Heart, ShoppingCart } from 'lucide-react';
import { useTheme } from '@/lib/theme';

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

// Floating glass top bar used on all main screens (matches Flutter MainTopBar).
// Glass material, border, radius, blur and title type are kept in lockstep with
// svayp_mobile/lib/shared/widgets/main_top_bar.dart so the WebView tabs (Closet,
// Market) look identical to the native tabs.
export function TopBar({
  title,
  showCartLiked = true,
}: {
  title: string;
  showCartLiked?: boolean;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const iconColor = isDark ? '#fff' : '#000';
  return (
    <div className="absolute top-0 left-0 right-0 z-50 px-4 pt-2 pb-1 pointer-events-none">
      <div
        className="flex items-center px-4 py-2.5 pointer-events-auto"
        style={{
          background: isDark ? 'rgba(5,5,8,0.82)' : 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 22,
          border: isDark
            ? '0.5px solid rgba(255,255,255,0.13)'
            : '0.5px solid rgba(0,0,0,0.16)',
        }}
      >
        <span
          className="flex-1 text-[22px] font-bold tracking-[-0.5px]"
          style={{ color: iconColor }}
        >
          {title}
        </span>
        {showCartLiked && (
          <>
            <button onClick={() => router.push('/liked')} className="w-10 h-10 flex items-center justify-center" aria-label="Liked">
              <Heart size={22} strokeWidth={1.8} color={iconColor} />
            </button>
            <button onClick={() => router.push('/cart')} className="w-10 h-10 flex items-center justify-center" aria-label="Cart">
              <ShoppingCart size={22} strokeWidth={1.8} color={iconColor} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
