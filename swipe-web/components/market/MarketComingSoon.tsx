import React from 'react';
import Head from 'next/head';
import { Store } from 'lucide-react';
import { TopBar } from '@/components/BottomNav';
import { useI18n } from '@/lib/i18n';

/**
 * "Coming soon" placeholder shown to users without Market access (not on the
 * allowlist and `feature.market_enabled` off). Matches the original market
 * placeholder, restyled to the LIBAS pink.
 */
export default function MarketComingSoon() {
  const { t } = useI18n();

  return (
    <>
      <Head>
        <title>{t.marketTitle}</title>
      </Head>

      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        <TopBar title={t.marketTitle} showCartLiked={false} />

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: '#F370A7', boxShadow: '0 12px 40px rgba(243,112,167,0.45)' }}
          >
            <Store size={40} strokeWidth={1.8} color="white" />
          </div>

          <h1 className="mt-7 text-[24px] font-extrabold tracking-[-0.5px] text-black dark:text-[#f0f0f0]">
            {t.marketComingSoonTitle}
          </h1>

          <p className="mt-2 max-w-[280px] text-[15px] leading-relaxed text-black/50 dark:text-white/45">
            {t.marketComingSoonText}
          </p>
        </div>
      </div>
    </>
  );
}
