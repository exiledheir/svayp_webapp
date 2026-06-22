import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Camera, Pencil, Navigation, Check, Plus } from 'lucide-react';
import { isMarketOnboardingComplete, setMarketOnboardingComplete } from '@/lib/market-storage';
import MarketGuard from '@/components/market/MarketGuard';
import { useI18n } from '@/lib/i18n';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';

/**
 * One-time Market onboarding gate — the "Как публиковать объявления? 3 простых
 * шага" intro. Mirrors the WELCOME screen of pages/onboarding.tsx. Shown until
 * the user posts their first listing (the create wizard sets the completion
 * flag on publish). The CTA goes straight to the wizard.
 */
function MarketOnboardingPageInner() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    // Already onboarded → skip straight to the wizard.
    if (isMarketOnboardingComplete()) {
      router.replace('/market/create');
      return;
    }
    logAnalyticsEvent(Events.MARKET_ONBOARDING_VIEWED);
  }, [router]);

  const steps = [
    { icon: Camera, label: t.mk_intro_step1, done: false },
    { icon: Pencil, label: t.mk_intro_step2, done: false },
    { icon: Navigation, label: t.mk_intro_step3, done: false },
    { icon: Check, label: t.mk_intro_done, done: true },
  ];

  return (
    <>
      <Head>
        <title>{t.mk_intro_title}</title>
      </Head>

      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        {/* Top: skip */}
        <div className="shrink-0 flex justify-end px-5 pt-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}>
          <button onClick={() => router.replace('/market')} className="text-[14px] font-medium text-black/40 dark:text-white/40 active:opacity-60">
            {t.mk_promote_skip}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {/* Hero badge */}
          <div className="flex justify-center pt-6 pb-8">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{ background: '#F370A7', boxShadow: '0 16px 50px rgba(243,112,167,0.45)' }}
            >
              <Plus size={52} strokeWidth={2.5} color="white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-[26px] font-extrabold tracking-tight text-center text-black dark:text-white leading-tight">
            {t.mk_intro_title}
          </h1>
          <p className="text-[20px] font-bold text-center text-[#F370A7] mt-1">{t.mk_intro_subtitle}</p>

          {/* Steps card */}
          <div className="mt-8 rounded-3xl p-2.5" style={{ border: '1px solid rgba(128,128,128,0.16)' }}>
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex items-center gap-3.5 px-2 py-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: s.done ? '#F370A7' : 'rgba(128,128,128,0.10)' }}
                  >
                    <Icon size={20} strokeWidth={2} color={s.done ? 'white' : '#222'} />
                  </div>
                  <span className={`text-[16px] ${s.done ? 'font-bold' : 'font-medium'} text-black dark:text-white`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="flex-none px-6 pb-2" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
          <button
            onClick={() => {
              // The intro is the one-time gate — completing it unlocks posting.
              setMarketOnboardingComplete();
              logAnalyticsEvent(Events.MARKET_ONBOARDING_COMPLETED);
              router.replace('/market/create');
            }}
            className="w-full py-4 rounded-2xl text-white font-semibold text-base active:opacity-90"
            style={{ background: '#F370A7' }}
          >
            {t.mk_post_cta}
          </button>
        </div>
      </div>
    </>
  );
}

export default function MarketOnboardingPage() {
  return (
    <MarketGuard>
      <MarketOnboardingPageInner />
    </MarketGuard>
  );
}
