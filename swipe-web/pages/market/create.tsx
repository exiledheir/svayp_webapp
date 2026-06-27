import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { isAuthenticated } from '@/lib/auth';
import {
  isMarketOnboardingComplete, getDraft, saveDraft, clearDraft,
  getMarketWizardStep, setMarketWizardStep, clearMarketWizardStep,
  clearMarketOnboarding,
} from '@/lib/market-storage';
import {
  createListing, updateListing, uploadListingImage, getListing,
  type CreateListingPayload,
} from '@/lib/market-api';
import { NO_BRAND, OTHER_BRAND } from '@/lib/market-attributes';
import { emptyDraft, type MarketDraft, type MarketListingStatus } from '@/types/market';
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

// Static height like the rest of the app (closet/add, shop, …). We deliberately
// do NOT track `visualViewport.height`: resizing the container when the keyboard
// opens makes the layout — and the pinned Continue button — jump up and down,
// which is jarring while typing. The on-screen keyboard simply overlays the
// bottom; the scrollable content keeps the focused field in view on its own.
const WIZARD_HEIGHT = '100dvh';

/** Decode a `data:` URL (compressed photo) into a Blob for upload. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);base64/)?.[1] ?? 'image/jpeg';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Resolve the brand sentinels to what the backend stores (free-text or none). */
function resolveBrand(form: MarketDraft): string | undefined {
  if (form.brand === NO_BRAND) return undefined;
  if (form.brand === OTHER_BRAND) return form.customBrand?.trim() || undefined;
  return form.brand;
}

/** Map the wizard draft + uploaded image ids to the create/update API payload. */
function draftToPayload(form: MarketDraft, imageIds: string[], status?: 'draft' | 'pending'): CreateListingPayload {
  return {
    title: form.title,
    description: form.description,
    category: form.category,
    condition: form.condition,
    brand: resolveBrand(form),
    sizes: form.sizes,
    colors: form.colors,
    season: form.season,
    length: form.length,
    hijabFriendly: form.hijabFriendly,
    fit: form.fit,
    material: form.material,
    country: form.country,
    customAttrs: form.customAttrs,
    dealType: form.dealType,
    price: form.price ?? 0,
    currency: form.currency,
    isUrgent: form.isUrgent,
    location: form.location,
    contactMethods: form.contactMethods,
    sellerContact: {
      name: form.seller?.name,
      phone: form.seller?.phone,
      telegramUsername: form.seller?.telegramUsername,
    },
    // Only send image ids when there are freshly-uploaded photos (on edit with no
    // new photos we omit it so the backend keeps the existing images).
    ...(imageIds.length ? { imageIds } : {}),
    ...(status ? { status } : {}),
  };
}

function MarketCreatePageInner() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState<number>(PHOTOS);
  const [form, setForm] = useState<MarketDraft>(() => emptyDraft());
  const [ready, setReady] = useState(false);
  // Edit mode: when set, the wizard updates an existing listing instead of
  // creating one, and never touches the separate create-draft in localStorage.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<MarketListingStatus | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const didStart = useRef(false);

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
    // Normal create flow: onboarding gate + resume the saved draft/step.
    const startCreate = () => {
      if (!isMarketOnboardingComplete()) {
        router.replace('/market/onboarding');
        return;
      }
      const draft = getDraft();
      if (draft) setForm(draft);
      const saved = getMarketWizardStep();
      setStep(saved >= PHOTOS && saved <= CONTACTS ? saved : PHOTOS);
      setReady(true);
    };

    // Edit mode: load the listing from the backend, prefill the form, and skip
    // the onboarding gate + the create-draft entirely.
    const editId = params.get('edit');
    if (editId) {
      getListing(editId)
        .then((listing) => {
          setForm({ ...listing, id: `edit_${listing.id}`, updatedAt: new Date().toISOString() });
          setEditingId(editId);
          setEditingStatus(listing.status);
          setStep(PHOTOS);
          setReady(true);
        })
        .catch(startCreate); // listing gone / error → fall back to a normal create
      return;
    }
    startCreate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss the publish error so it never lingers over the CTA.
  useEffect(() => {
    if (!publishError) return;
    const id = setTimeout(() => setPublishError(''), 4000);
    return () => clearTimeout(id);
  }, [publishError]);

  // ── Persist step + analytics on change ──────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    if (!didStart.current) {
      didStart.current = true;
      logAnalyticsEvent(Events.MARKET_LISTING_STARTED);
    }
    if (step <= CONTACTS) {
      if (!editingId) setMarketWizardStep(step); // don't disturb create-flow resume while editing
      logAnalyticsEvent(Events.MARKET_LISTING_STEP_VIEWED, { [Params.MK_STEP]: STEP_NAMES[step] });
    }
  }, [step, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  function patch(p: Partial<MarketDraft>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function persist(next: MarketDraft) {
    if (editingId) return; // edit mode keeps changes in memory until publish
    saveDraft(next);
  }

  function goNext(from: number) {
    logAnalyticsEvent(Events.MARKET_LISTING_STEP_COMPLETED, { [Params.MK_STEP]: STEP_NAMES[from] });
    persist(form);
    setStep(from + 1);
  }

  function goBack() {
    if (step === PHOTOS) router.push(editingId ? '/market/mine' : '/market');
    else setStep((s) => s - 1);
  }

  // Contacts step → unauthenticated users: persist draft + step, bounce through auth.
  function needAuth(phone: string) {
    const next = { ...form, seller: { ...(form.seller ?? { id: '', name: '' }), phone } };
    saveDraft(next);
    setMarketWizardStep(CONTACTS);
    router.push('/auth/phone?redirect=' + encodeURIComponent('/market/create'));
  }

  async function publish() {
    if (publishing) return;
    setPublishing(true);
    setPublishError('');
    try {
      // 1. Upload any photos still held as local dataURLs (newly added). Existing
      //    already-uploaded images (edit mode) stay on the listing untouched.
      const imgs = form.images ?? [];
      const imageIds: string[] = [];
      for (let i = 0; i < imgs.length; i++) {
        if (!imgs[i].startsWith('data:')) continue;
        const blob = dataUrlToBlob(imgs[i]);
        const file = new File([blob], `photo-${i}.jpg`, { type: blob.type || 'image/jpeg' });
        const status = await uploadListingImage(file, undefined, i, editingId ?? undefined);
        if (status.listingImageId) imageIds.push(status.listingImageId);
      }

      if (editingId) {
        // 2a. Edit → PATCH the fields (no `status`: the update endpoint rejects
        //     it). The backend re-queues the edited listing for review on its
        //     own (a rejected listing goes back to pending), so no extra call.
        await updateListing(editingId, draftToPayload(form, imageIds));
        logAnalyticsEvent(Events.MARKET_LISTING_UPDATED, {
          listing_id: editingId,
          resubmitted: editingStatus === 'rejected',
        });
      } else {
        // 2b. Create → POST a new listing (status=pending → admin moderation).
        const created = await createListing(draftToPayload(form, imageIds, 'pending'));
        clearDraft();
        clearMarketWizardStep();
        logAnalyticsEvent(Events.MARKET_LISTING_PUBLISHED, {
          listing_id: created.id,
          [Params.MK_CATEGORY]: created.category,
          [Params.MK_DEAL_TYPE]: created.dealType,
        });
      }
      setStep(PUBLISHED);
    } catch {
      setPublishError(t.mk_publish_error);
    } finally {
      setPublishing(false);
    }
  }

  if (!ready) {
    return <div className="phone-container bg-white dark:bg-[#111111]" style={{ height: WIZARD_HEIGHT }} />;
  }

  // ── Published / saved success screen (inline) ───────────────────────────────
  if (step === PUBLISHED) {
    // Copy depends on whether we created, edited, or resubmitted (rejected → review).
    const resubmitted = editingId && editingStatus === 'rejected';
    const doneTitle = !editingId ? t.mk_published_title : resubmitted ? t.mk_resubmit_title : t.mk_updated_title;
    const doneBody = !editingId ? t.mk_published_body : resubmitted ? t.mk_resubmit_body : t.mk_updated_body;
    return (
      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: WIZARD_HEIGHT }}>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'rgba(243,112,167,0.12)' }}>
            <Check size={48} color="#F370A7" strokeWidth={2.5} />
          </div>
          <h1 className="text-[24px] font-extrabold mt-6 text-black dark:text-white">{doneTitle}</h1>
          <p className="text-[15px] leading-relaxed text-black/55 dark:text-white/55 mt-2 max-w-[300px]">{doneBody}</p>
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
      <div className="phone-container flex flex-col bg-white dark:bg-[#111111] overflow-hidden" style={{ height: WIZARD_HEIGHT }}>
        <WizardHeader step={step} totalSteps={TOTAL_STEPS} onBack={goBack} />

        {step === PHOTOS && <PhotosStep {...stepProps} />}
        {step === DETAILS && <DetailsStep {...stepProps} />}
        {step === CHARACTERISTICS && <CharacteristicsStep {...stepProps} />}
        {step === DEAL && <DealStep {...stepProps} />}
        {step === LOCATION && <LocationStep {...stepProps} />}
        {step === CONTACTS && (
          <ContactsStep form={form} patch={patch} authed={isAuthenticated()} onNeedAuth={needAuth} onPublish={publish} editing={!!editingId} />
        )}

        {/* Publish overlay — uploading photos + creating the listing on the backend. */}
        {publishing && (
          <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center gap-3" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div className="w-10 h-10 rounded-full border-[3px] border-white border-t-transparent animate-spin" />
            <p className="text-white text-[14px] font-semibold">{t.mk_publish_cta}…</p>
          </div>
        )}
        {publishError && (
          // Sits ABOVE the pinned CTA and is click-through, so it can never
          // cover or block the publish button. Auto-dismisses after a few sec.
          <div className="absolute left-4 right-4 z-[85] px-4 py-3 rounded-2xl text-white text-[13px] font-semibold text-center pointer-events-none shadow-lg"
               style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)', background: '#F370A7' }}>
            {publishError}
          </div>
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
