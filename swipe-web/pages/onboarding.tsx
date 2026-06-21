import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Sparkles, Check } from 'lucide-react';
import {
  isOnboardingComplete, setOnboardingComplete, clearOnboarding,
  setOnboardingStep, getOnboardingStep, clearOnboardingStep,
  setClosetTourDone,
} from '@/lib/onboarding-storage';
import { fetchClosetItems, type ClosetItem, type ClosetCategory } from '@/lib/closet-storage';
import {
  UPPER_CATS, LOWER_CATS, SHOES_CATS, ACC_CATS, FULL_BODY_CATS,
  type SavedCanvasLayout,
} from '@/lib/closet-types';
import { createOutfitCanvas } from '@/lib/wardrobe-api';
import InteractiveCanvas from '@/components/closet/InteractiveCanvas';
import AddItemStep from '@/components/onboarding/AddItemStep';
import GenerateStep from '@/components/onboarding/GenerateStep';
import TryOnStep from '@/components/onboarding/TryOnStep';
import { useI18n } from '@/lib/i18n';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';

// ─── Step machine ───────────────────────────────────────────────────────────────
const WELCOME = 0, ADD_UPPER = 1, ADD_LOWER = 2, GENERATE = 3, EDIT = 4, TRY_ON = 5, DONE = 6;
// ADD_SHOES is an alternative second-item step shown after a dress/jumpsuit
// (full-body) is added instead of ADD_LOWER. Numbered above DONE so existing
// step ordering is untouched; treated as part of the "add" phase for progress.
const ADD_SHOES = 7;
// Action steps shown in the progress indicator (add → generate → edit → try-on)
const PROGRESS_STEPS = [ADD_UPPER, GENERATE, EDIT, TRY_ON];
// Second-item steps that belong to the same "add" phase as ADD_UPPER.
const ADD_SECOND_STEPS = [ADD_LOWER, ADD_SHOES];
const STEP_NAMES: Record<number, string> = {
  [WELCOME]: 'welcome', [ADD_UPPER]: 'add_upper', [ADD_LOWER]: 'add_lower', [ADD_SHOES]: 'add_shoes',
  [GENERATE]: 'generate', [EDIT]: 'edit', [TRY_ON]: 'try_on', [DONE]: 'done',
};

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState<number>(WELCOME);
  const [ready, setReady] = useState(false);
  const [addedItems, setAddedItems] = useState<ClosetItem[]>([]);
  // True once the user has added at least one item this session (uploads run in
  // the background, so addedItems isn't populated until the generate step).
  const [hasAddedItem, setHasAddedItem] = useState(false);
  const [layout, setLayout] = useState<SavedCanvasLayout | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const didStart = useRef(false);
  // Holds promises for background uploads started in AddItemStep.
  const pendingUploadsRef = useRef<Promise<unknown>[]>([]);

  // ── Mount: handle reset / returning user / resume ──────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'true') {
      clearOnboarding();
      clearOnboardingStep();
    } else if (isOnboardingComplete()) {
      router.replace('/closet');
      return;
    }
    (async () => {
      const saved = getOnboardingStep();
      // Resume rules:
      // - ADD_LOWER / ADD_SHOES: restart from ADD_UPPER so the user always adds
      //   both items fresh rather than landing mid-add-phase and being confused.
      // - Beyond GENERATE: resume at GENERATE (in-memory layout is lost on reload).
      const resume = ADD_SECOND_STEPS.includes(saved) ? ADD_UPPER
        : saved > GENERATE && saved <= DONE ? GENERATE
        : saved;
      setStep(resume);
      setReady(true);
      // Always check the existing closet — both to restore items on resume and to
      // decide whether the Skip button is offered (users with items can skip).
      try {
        const its = await fetchClosetItems();
        if (its.length > 0) {
          setHasAddedItem(true);
          if (saved > WELCOME) setAddedItems(its);
        }
      } catch { /* ignore */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Analytics: started once, step-viewed on each change ────────────────────
  useEffect(() => {
    if (!ready) return;
    if (!didStart.current) {
      didStart.current = true;
      logAnalyticsEvent(Events.ONBOARDING_STARTED);
    }
    setOnboardingStep(step);
    logAnalyticsEvent(Events.ONBOARDING_STEP_VIEWED, { [Params.OB_STEP]: STEP_NAMES[step] });
  }, [step, ready]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  function completeStep(name: string) {
    logAnalyticsEvent(Events.ONBOARDING_STEP_COMPLETED, { [Params.OB_STEP]: name });
  }

  /** Awaits all background uploads then fetches the fresh item list. */
  async function awaitUploadsAndFetch(): Promise<ClosetItem[]> {
    await Promise.allSettled(pendingUploadsRef.current);
    try {
      const its = await fetchClosetItems();
      setAddedItems(its);
      return its;
    } catch {
      return addedItems;
    }
  }

  function finish() {
    logAnalyticsEvent(Events.ONBOARDING_COMPLETED);
    setOnboardingComplete();
    clearOnboardingStep();
    // Interactive onboarding already taught the core actions — suppress the
    // closet's passive coach-mark tour (still replayable from the profile).
    setClosetTourDone();
    router.replace('/closet');
  }

  function skip() {
    logAnalyticsEvent(Events.ONBOARDING_SKIPPED, { [Params.OB_STEP]: STEP_NAMES[step] });
    setOnboardingComplete();
    clearOnboardingStep();
    setClosetTourDone();
    router.replace('/closet');
  }

  // ── Step transitions ───────────────────────────────────────────────────────
  function handleUpperAdded(category: ClosetCategory, uploadP: Promise<unknown>) {
    completeStep('add_upper');
    setHasAddedItem(true);
    pendingUploadsRef.current.push(uploadP);
    if (FULL_BODY_CATS.includes(category)) {
      // A dress/jumpsuit is a complete top+bottom — pair it with shoes instead
      // of a bottom, then generate a top (dress) + shoes outfit.
      showToast(t.ob_dress_skip_toast);
      setStep(ADD_SHOES);
    } else {
      setStep(ADD_LOWER);
    }
  }

  function handleLowerAdded(_cat: ClosetCategory, uploadP: Promise<unknown>) {
    completeStep('add_lower');
    setHasAddedItem(true);
    pendingUploadsRef.current.push(uploadP);
    setStep(GENERATE);
  }

  function handleShoesAdded(_cat: ClosetCategory, uploadP: Promise<unknown>) {
    completeStep('add_shoes');
    setHasAddedItem(true);
    pendingUploadsRef.current.push(uploadP);
    setStep(GENERATE);
  }

  async function persistCanvas(l: SavedCanvasLayout) {
    const apiItems = l
      .filter((e) => !e.id.startsWith('local_') && !e.id.startsWith('pending_'))
      .map((e) => ({ wardrobeItemId: e.id, x: e.x, y: e.y, scale: e.scale, zIndex: e.zIndex, itemGroup: e.group }));
    if (apiItems.length === 0) return;
    try { await createOutfitCanvas({ items: apiItems }); } catch { /* non-blocking */ }
  }

  if (!ready) {
    return <div className="phone-container bg-white dark:bg-[#111111]" style={{ height: '100dvh' }} />;
  }

  // EDIT step renders the full-screen canvas editor directly (it owns its own chrome).
  if (step === EDIT) {
    return (
      <>
        <InteractiveCanvas
          upper={addedItems.filter((i) => UPPER_CATS.includes(i.category))}
          lower={addedItems.filter((i) => LOWER_CATS.includes(i.category))}
          shoes={addedItems.filter((i) => SHOES_CATS.includes(i.category))}
          acc={addedItems.filter((i) => ACC_CATS.includes(i.category))}
          initialLayout={layout}
          allItems={addedItems}
          onClose={() => { setStep(TRY_ON); }}
          onSave={(l) => { completeStep('edit'); setLayout(l); persistCanvas(l); setStep(TRY_ON); }}
          onRegenerate={() => { }}
          onShowPlans={() => { }}
          canRegenerate={false}
          plansEnabled={false}
          alwaysShowHint={true}
        />
      </>
    );
  }

  return (
    <div className="phone-container flex flex-col bg-white dark:bg-[#111111] overflow-hidden" style={{ height: '100dvh' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-4 py-2.5 rounded-full bg-gray-900 text-white text-[13px] font-semibold shadow-lg text-center max-w-[90vw]">
          {toast}
        </div>
      )}

      {/* Top bar: progress + skip */}
      <div className="relative z-10 flex-none flex items-center justify-between px-5 pt-4 pb-1" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}>
        <div className="flex gap-1.5">
          {PROGRESS_STEPS.map((s) => {
            // Second-item steps (ADD_LOWER / ADD_SHOES) share the ADD_UPPER dot.
            const progressStep = ADD_SECOND_STEPS.includes(step) ? ADD_UPPER : step;
            const reached = progressStep >= s;
            const isCurrent = progressStep === s;
            return (
              <div
                key={s}
                className="rounded-full transition-all duration-300"
                style={{ width: isCurrent ? 20 : 8, height: 8, background: reached ? '#F370A7' : '#E5E7EB' }}
              />
            );
          })}
        </div>
        {/* Skip is offered only once the user has at least one item — with an
            empty closet we keep them in the guided flow. */}
        {step !== WELCOME && step !== DONE && (hasAddedItem || addedItems.length > 0) && (
          <button onClick={skip} className="text-[13px] font-medium text-gray-400 active:opacity-60">
            {t.ob_skip}
          </button>
        )}
      </div>

      {/* Step body */}
      {step === WELCOME && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div
              className="flex flex-col items-center justify-center gap-6 rounded-3xl px-14 py-16"
              style={{ background: 'rgba(243,112,167,0.08)', boxShadow: '0 0 100px 30px rgba(243,112,167,0.12)' }}
            >
              <p className="text-[52px] font-black tracking-[3px] leading-none select-none">
                <span className="text-black dark:text-white">LIB</span>
                <span style={{ color: '#F370A7' }}>Λ</span>
                <span className="text-black dark:text-white">S</span>
              </p>
            </div>
          </div>
          <div className="px-6 pb-4">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">{t.ob_welcome_title}</h2>
            <p className="text-[16px] font-medium leading-relaxed text-gray-600 dark:text-gray-300 max-w-[34ch]">{t.ob_welcome_body}</p>
          </div>
          <div className="flex-none px-6 pb-2" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
            <button
              onClick={() => setStep(ADD_UPPER)}
              className="w-full py-4 rounded-2xl text-white font-semibold text-base active:opacity-80 flex items-center justify-center gap-2"
              style={{ background: '#F370A7' }}
            >
              <Sparkles size={18} />
              {t.ob_welcome_cta}
            </button>
          </div>
        </div>
      )}

      {step === ADD_UPPER && (
        <AddItemStep key="add-upper" group="upper" title={t.ob_add_upper_title} body={t.ob_add_upper_body} onItemAdded={handleUpperAdded} />
      )}

      {step === ADD_LOWER && (
        <AddItemStep key="add-lower" group="lower" title={t.ob_add_lower_title} body={t.ob_add_lower_body} onItemAdded={handleLowerAdded} />
      )}

      {step === ADD_SHOES && (
        <AddItemStep key="add-shoes" group="shoes" title={t.ob_add_shoes_title} body={t.ob_add_shoes_body} onItemAdded={handleShoesAdded} />
      )}

      {step === GENERATE && (
        <GenerateStep
          awaitAndFetch={awaitUploadsAndFetch}
          title={t.ob_generate_title}
          body={t.ob_generate_body}
          onGenerated={(l, its) => { completeStep('generate'); setLayout(l); setAddedItems(its); }}
          onContinue={() => setStep(EDIT)}
        />
      )}

      {step === TRY_ON && (
        <TryOnStep
          items={addedItems}
          layout={layout}
          title={t.ob_tryon_title}
          body={t.ob_tryon_body}
          onFinished={() => { completeStep('try_on'); finish(); }}
        />
      )}

      {step === DONE && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
            <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'rgba(243,112,167,0.12)' }}>
              <Check size={48} color="#F370A7" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">{t.ob_done_title}</h2>
              <p className="text-[16px] font-medium leading-relaxed text-gray-600 dark:text-gray-300 max-w-[34ch]">{t.ob_done_body}</p>
            </div>
          </div>
          <div className="flex-none px-6 pb-2" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
            <button
              onClick={finish}
              className="w-full py-4 rounded-2xl text-white font-semibold text-base active:opacity-80"
              style={{ background: '#F370A7' }}
            >
              {t.ob_done_cta}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
