import React from 'react';
import Head from 'next/head';
import { Store } from 'lucide-react';
import { TopBar } from '@/components/BottomNav';
import { useI18n } from '@/lib/i18n';

/**
 * Market tab — a "coming soon" placeholder.
 *
 * Loaded inside the Flutter WebView (the native Market tab points here) as well
 * as in a plain browser. Like the Closet tab, it deliberately does NOT render
 * the web BottomNav: inside Flutter the native nav handles navigation. The page
 * is listed in PUBLIC_PATHS (_app.tsx) so guests can view it without auth.
 */
export default function MarketPage() {
  const { t } = useI18n();

  return (
    <>
      <Head>
        <title>{t.marketTitle}</title>
      </Head>

      <div
        className="phone-container flex flex-col bg-white dark:bg-[#111111]"
        style={{ height: '100dvh' }}
      >
        {/* ── Glass top bar (matches Closet / Shop) ── */}
        <TopBar title={t.marketTitle} showCartLiked={false} />

        {/* ── Centered coming-soon content ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          {/* Gradient badge with store icon */}
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center vs-pulse"
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #F5576c 100%)',
              boxShadow: '0 12px 40px rgba(240,147,251,0.45)',
            }}
          >
            <Store size={40} strokeWidth={1.8} color="white" />
          </div>

          {/* Coming soon title */}
          <h1
            className="mt-7 text-[24px] font-extrabold tracking-[-0.5px] text-black dark:text-[#f0f0f0]"
          >
            {t.marketComingSoonTitle}
          </h1>

          {/* Subtitle */}
          <p className="mt-2 max-w-[280px] text-[15px] leading-relaxed text-black/50 dark:text-white/45">
            {t.marketComingSoonText}
          </p>
        </div>
      </div>
    </>
  );
}
