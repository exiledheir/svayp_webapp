import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Shirt } from 'lucide-react';
import { isOnboardingComplete, setOnboardingComplete } from '@/lib/onboarding-storage';
import { useI18n } from '@/lib/i18n';

const SLIDE_COUNT = 6;
const SLIDE_WIDTH = `${100 / SLIDE_COUNT}%`;

// ─── Shared primitives ──────────────────────────────────────────────────────────

function SlideWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col" style={{ width: SLIDE_WIDTH, flexShrink: 0 }}>
      {children}
    </div>
  );
}

function SlideText({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 pb-4">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
    </div>
  );
}

// ─── Slides ─────────────────────────────────────────────────────────────────────

function SlideWelcome() {
  const { t } = useI18n();
  return (
    <SlideWrapper>
      <div className="flex-1 flex items-center justify-center">
        <div
          className="flex flex-col items-center justify-center gap-6 rounded-3xl px-14 py-16"
          style={{
            background: 'rgba(243,112,167,0.08)',
            boxShadow: '0 0 100px 30px rgba(243,112,167,0.12)',
          }}
        >
          <p className="text-[52px] font-black tracking-[3px] leading-none select-none">
            <span className="text-black">LIB</span>
            <span style={{ color: '#F370A7' }}>Λ</span>
            <span className="text-black">S</span>
          </p>
        </div>
      </div>
      <SlideText title={t.onboarding_slide1_title} body={t.onboarding_slide1_body} />
    </SlideWrapper>
  );
}

function SlideBuildWardrobe() {
  const { t } = useI18n();
  const [err1, setErr1] = useState(false);
  const [err2, setErr2] = useState(false);
  return (
    <SlideWrapper>
      <div className="flex-1 flex items-center px-5 gap-3">
        {/* Original photo */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div
            className="relative w-full rounded-2xl overflow-hidden bg-gray-100"
            style={{ aspectRatio: '3/4', maxHeight: '46vh' }}
          >
            {!err1 ? (
              <Image
                src="/images/closet/user_new_item.png"
                alt="Original photo"
                fill
                className="object-cover"
                onError={() => setErr1(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Shirt size={36} color="#ccc" />
              </div>
            )}
          </div>
          <span className="text-xs text-gray-400 shrink-0">{t.onboarding_slide2_original}</span>
        </div>

        {/* Arrow */}
        <span className="flex-none text-black font-bold text-2xl shrink-0">→</span>

        {/* Generated flat-style */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              aspectRatio: '3/4',
              maxHeight: '46vh',
              background: 'linear-gradient(135deg, #FEF3F8 0%, #FDE8F3 100%)',
            }}
          >
            {!err2 ? (
              <Image
                src="/images/closet/user_new_item_regenerated.png"
                alt="AI flat style"
                fill
                className="object-contain p-3"
                onError={() => setErr2(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Shirt size={36} color="#F370A7" />
              </div>
            )}
          </div>
          <span className="text-xs font-medium shrink-0" style={{ color: '#F370A7' }}>
            {t.onboarding_slide2_aiflat}
          </span>
        </div>
      </div>
      <SlideText title={t.onboarding_slide2_title} body={t.onboarding_slide2_body} />
    </SlideWrapper>
  );
}

function SlideAIOutfits() {
  const { t } = useI18n();
  const [err1, setErr1] = useState(false);
  const [err2, setErr2] = useState(false);
  const [err3, setErr3] = useState(false);
  const imgs = [
    { src: '/images/closet/outfit_grouped.png', err: err1, setErr: setErr1 },
    { src: '/images/closet/outfit_grouped2.png', err: err2, setErr: setErr2 },
    { src: '/images/closet/outfit_grouped3.png', err: err3, setErr: setErr3 },
  ];
  return (
    <SlideWrapper>
      <div className="flex-1 flex items-center justify-center px-4 gap-2">
        {imgs.map(({ src, err, setErr }, i) => (
          <div
            key={i}
            className="flex-1 relative rounded-2xl overflow-hidden"
            style={{ aspectRatio: '3/4', maxHeight: '52vh' }}
          >
            {!err ? (
              <Image
                src={src}
                alt="AI outfit"
                fill
                className="object-contain"
                onError={() => setErr(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Shirt size={32} color="#ccc" />
              </div>
            )}
          </div>
        ))}
      </div>
      <SlideText title={t.onboarding_slide3_title} body={t.onboarding_slide3_body} />
    </SlideWrapper>
  );
}

function SlideEditOutfit() {
  const { t } = useI18n();
  return (
    <SlideWrapper>
      <div className="flex-1 flex items-end justify-center px-6 pb-4">
        <div
          className="relative w-full rounded-2xl overflow-hidden bg-gray-100"
          style={{ aspectRatio: '9/16', maxHeight: '52vh' }}
        >
          <video
            src="/video/closet/outfit_edit.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>
      <SlideText title={t.onboarding_slide4_title} body={t.onboarding_slide4_body} />
    </SlideWrapper>
  );
}

function SlideTryItOn() {
  const { t } = useI18n();
  const [err1, setErr1] = useState(false);
  const [err2, setErr2] = useState(false);
  return (
    <SlideWrapper>
      <div className="flex-1 flex items-center px-5 gap-3">
        {/* Original */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div
            className="relative w-full rounded-2xl overflow-hidden bg-gray-100"
            style={{ aspectRatio: '3/4', maxHeight: '46vh' }}
          >
            {!err1 ? (
              <Image
                src="/images/closet/outfit_example.png"
                alt="Original"
                fill
                className="object-cover"
                onError={() => setErr1(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Shirt size={36} color="#ccc" />
              </div>
            )}
          </div>
          <span className="text-xs text-gray-400 shrink-0">{t.onboarding_slide2_original}</span>
        </div>

        {/* Arrow */}
        <span className="flex-none text-black font-bold text-2xl shrink-0">→</span>

        {/* Try-on result */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div
            className="relative w-full rounded-2xl overflow-hidden bg-gray-100"
            style={{ aspectRatio: '3/4', maxHeight: '46vh' }}
          >
            {!err2 ? (
              <Image
                src="/images/closet/outfit_tryit_on.jpg"
                alt="Try-on result"
                fill
                className="object-cover"
                onError={() => setErr2(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Shirt size={36} color="#F370A7" />
              </div>
            )}
          </div>
          <span className="text-xs font-medium shrink-0" style={{ color: '#F370A7' }}>{t.onboarding_slide5_title}</span>
        </div>
      </div>
      <SlideText title={t.onboarding_slide5_title} body={t.onboarding_slide5_body} />
    </SlideWrapper>
  );
}

function SlideCTA() {
  const { t } = useI18n();
  const [err, setErr] = useState(false);
  return (
    <SlideWrapper>
      <div className="flex-1 flex items-center justify-center px-8">
        <div
          className="relative w-full rounded-3xl overflow-hidden"
          style={{
            aspectRatio: '3/4',
            maxHeight: '55vh',
            background: 'rgba(243,112,167,0.08)',
          }}
        >
          {!err ? (
            <Image
              src="/images/closet/outfitcard_empty_state.png"
              alt="Get started"
              fill
              className="object-contain p-4"
              onError={() => setErr(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Shirt size={80} color="#F370A7" strokeWidth={1.25} />
            </div>
          )}
        </div>
      </div>
      <SlideText title={t.onboarding_cta_title} body={t.onboarding_cta_body} />
    </SlideWrapper>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Returning user: skip onboarding entirely
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'true') {
      localStorage.removeItem('svayp_onboarding_complete');
      return;
    }
    if (isOnboardingComplete()) router.replace('/closet');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    if (current < SLIDE_COUNT - 1) setCurrent((c) => c + 1);
  }

  function skipToCta() {
    setCurrent(SLIDE_COUNT - 1);
  }

  function finish(addItem: boolean) {
    setOnboardingComplete();
    router.replace(addItem ? '/closet?addItem=true' : '/closet');
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -50) advance();
    else if (dx > 50 && current > 0) setCurrent((c) => c - 1);
  }

  const isCta = current === SLIDE_COUNT - 1;

  return (
    <div
      className="phone-container flex flex-col bg-white overflow-hidden"
      style={{ height: '100dvh' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides carousel */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex h-full"
          style={{
            width: `${SLIDE_COUNT * 100}%`,
            transform: `translateX(-${(current * 100) / SLIDE_COUNT}%)`,
            transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          <SlideWelcome />
          <SlideBuildWardrobe />
          <SlideAIOutfits />
          <SlideEditOutfit />
          <SlideTryItOn />
          <SlideCTA />
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className="flex-none px-6 pt-4"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setCurrent(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 20 : 8,
                height: 8,
                background: i === current ? '#F370A7' : '#E5E7EB',
              }}
            />
          ))}
        </div>

        {isCta ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => finish(true)}
              className="w-full py-4 rounded-2xl text-white font-semibold text-base active:opacity-80"
              style={{ background: '#F370A7' }}
            >
              {t.onboarding_btn_add_item}
            </button>
            <button
              onClick={() => finish(false)}
              className="w-full py-2 text-gray-400 text-sm active:opacity-60"
            >
              {t.onboarding_btn_skip}
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <button
              onClick={skipToCta}
              className="text-gray-400 text-sm py-2 active:opacity-60"
            >
              {t.onboarding_btn_skip}
            </button>
            <button
              onClick={advance}
              className="py-3 px-8 rounded-full text-white font-semibold text-sm active:opacity-80"
              style={{ background: '#111' }}
            >
              {t.onboarding_btn_next} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
