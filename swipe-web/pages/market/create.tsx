import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { isAuthenticated } from '@/lib/auth';
import {
  isMarketOnboardingComplete, getDraft, saveDraft, clearDraft,
  getMarketWizardStep, setMarketWizardStep, clearMarketWizardStep,
  clearMarketOnboarding, finalizeDraft, addListing,
} from '@/lib/market-storage';
import { emptyDraft, type MarketDraft } from '@/types/market';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';

import MarketGuard from '@/components/market/MarketGuard';
import WizardHeader from '@/components/market/WizardHeader';
import PhotosStep from '@/components/market/steps/PhotosStep';
import DetailsStep from '@/components/market/steps/DetailsStep';
import CharacteristicsStep from '@/components/market/steps/CharacteristicsStep';
import DealStep from '@/components/market/steps/DealStep';
import LocationStep from '@/components/market/steps/LocationStep';
import ContactsStep from '@/components/market/steps/ContactsStep';

// ─── Step machine ────────────────────────────────────────────────────────────
// Title + category + description are merged into DETAILS; phone is merged into
// CONTACTS; the promote step is removed for now.
const PHOTOS = 0, DETAILS = 1, CHARACTERISTICS = 2, DEAL = 3, LOCATION = 4,
  CONTACTS = 5, PUBLISHED = 6;
const TOTAL_STEPS = 6; // PHOTOS..CONTACTS
const STEP_NAMES: Record<number, string> = {
  [PHOTOS]: 'photos', [DETAILS]: 'details', [CHARACTERISTICS]: 'characteristics',
  [DEAL]: 'deal', [LOCATION]: 'location', [CONTACTS]: 'contacts',
};

/**
 * Tracks the *visual* viewport height so the page shrinks to the area above the
 * on-screen keyboard. Without this, the `100dvh` container stays full-height
 * when the keyboard opens, the browser scrolls it to keep the focused input in
 * view, and the pinned footer (Continue / nav) appears to jump to the top.
 * Pinning the container to `visualViewport.height` keeps the footer just above
 * the keyboard instead. Falls back to `100dvh` where the API is unavailable.
 */
function useViewportHeight(): string {
  const [h, setH] = useState('100dvh');
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setH(`${Math.round(vv.height)}px`);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return h;
}

function MarketCreatePageInner() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState<number>(PHOTOS);
  const [form, setForm] = useState<MarketDraft>(() => emptyDraft());
  const [ready, setReady] = useState(false);
  const didStart = useRef(false);
  const viewportH = useViewportHeight();

  // ── Mount: gate + resume ────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'true') {
      clearMarketOnboarding();
      clearDraft();
      clearMarketWizardStep();
      router.replace('/market/onboarding');
      return;
    }
    if (!isMarketOnboardingComplete()) {
      router.replace('/market/onboarding');
      return;
    }
    const draft = getDraft();
    if (draft) setForm(draft);
    const saved = getMarketWizardStep();
    setStep(saved >= PHOTOS && saved <= CONTACTS ? saved : PHOTOS);
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist step + analytics on change ──────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    if (!didStart.current) {
      didStart.current = true;
      logAnalyticsEvent(Events.MARKET_LISTING_STARTED);
    }
    if (step <= CONTACTS) {
      setMarketWizardStep(step);
      logAnalyticsEvent(Events.MARKET_LISTING_STEP_VIEWED, { [Params.MK_STEP]: STEP_NAMES[step] });
    }
  }, [step, ready]);

  function patch(p: Partial<MarketDraft>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function persist(next: MarketDraft) {
    saveDraft(next);
  }

  function goNext(from: number) {
    logAnalyticsEvent(Events.MARKET_LISTING_STEP_COMPLETED, { [Params.MK_STEP]: STEP_NAMES[from] });
    persist(form);
    setStep(from + 1);
  }

  function goBack() {
    if (step === PHOTOS) router.push('/market');
    else setStep((s) => s - 1);
  }

  // Contacts step → unauthenticated users: persist draft + step, bounce through auth.
  function needAuth(phone: string) {
    const next = { ...form, seller: { ...(form.seller ?? { id: '', name: '' }), phone } };
    saveDraft(next);
    setMarketWizardStep(CONTACTS);
    router.push('/auth/phone?redirect=' + encodeURIComponent('/market/create'));
  }

  function publish() {
    const listing = finalizeDraft(form, form.seller?.name);
    addListing(listing);
    clearDraft();
    clearMarketWizardStep();
    logAnalyticsEvent(Events.MARKET_LISTING_PUBLISHED, {
      listing_id: listing.id,
      [Params.MK_CATEGORY]: listing.category,
      [Params.MK_DEAL_TYPE]: listing.dealType,
    });
    setStep(PUBLISHED);
  }

  if (!ready) {
    return <div className="phone-container bg-white dark:bg-[#111111]" style={{ height: viewportH }} />;
  }

  // ── Published success screen (inline) ───────────────────────────────────────
  if (step === PUBLISHED) {
    return (
      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: viewportH }}>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'rgba(243,112,167,0.12)' }}>
            <Check size={48} color="#F370A7" strokeWidth={2.5} />
          </div>
          <h1 className="text-[24px] font-extrabold mt-6 text-black dark:text-white">{t.mk_published_title}</h1>
          <p className="text-[15px] leading-relaxed text-black/55 dark:text-white/55 mt-2 max-w-[300px]">{t.mk_published_body}</p>
        </div>
        <div className="flex-none px-6 pb-2 flex flex-col gap-2.5" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
          <button
            onClick={() => router.replace('/market/mine')}
            className="w-full py-4 rounded-2xl text-white font-semibold text-base active:opacity-90"
            style={{ background: '#F370A7' }}
          >
            {t.mk_my_listings}
          </button>
          <button
            onClick={() => router.replace('/market')}
            className="w-full py-3.5 rounded-2xl font-semibold text-[15px] text-black dark:text-white active:opacity-70"
            style={{ background: 'rgba(128,128,128,0.12)' }}
          >
            {t.mk_published_back}
          </button>
        </div>
      </div>
    );
  }

  const stepProps = { form, patch, onNext: () => goNext(step) };

  return (
    <>
      <Head>
        <title>{t.mk_post_cta}</title>
      </Head>
      <div className="phone-container flex flex-col bg-white dark:bg-[#111111] overflow-hidden" style={{ height: viewportH }}>
        <WizardHeader step={step} totalSteps={TOTAL_STEPS} onBack={goBack} />

        {step === PHOTOS && <PhotosStep {...stepProps} />}
        {step === DETAILS && <DetailsStep {...stepProps} />}
        {step === CHARACTERISTICS && <CharacteristicsStep {...stepProps} />}
        {step === DEAL && <DealStep {...stepProps} />}
        {step === LOCATION && <LocationStep {...stepProps} />}
        {step === CONTACTS && (
          <ContactsStep form={form} patch={patch} authed={isAuthenticated()} onNeedAuth={needAuth} onPublish={publish} />
        )}
      </div>
    </>
  );
}

export default function MarketCreatePage() {
  return (
    <MarketGuard>
      <MarketCreatePageInner />
    </MarketGuard>
  );
}
