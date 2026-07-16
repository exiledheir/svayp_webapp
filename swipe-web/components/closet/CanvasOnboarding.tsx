import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';

// Reuse the beautified cut-out as the demo object (matches Acloset's single-image tutorial).
const DEMO_IMG = '/images/onboarding/beautify/beautifed.jpeg';

type StepKey = 'move' | 'resize' | 'layer';

/**
 * One-time canvas-editor tutorial (Acloset-style). Teaches the two touch
 * gestures the outfit canvas actually supports — drag to move, pinch to
 * resize — plus how to add pieces from the closet. Each step shows the demo
 * cut-out with an animated blue "finger" indicator, a title/subtitle, and a
 * Next button. Shown once, gated by `isCanvasEditOnboarded()`.
 */
export default function CanvasOnboarding({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const steps: { key: StepKey; title: string; body: string }[] = [
    { key: 'move', title: t.cv_ce_move_title, body: t.cv_ce_move_body },
    { key: 'resize', title: t.cv_ce_resize_title, body: t.cv_ce_resize_body },
    { key: 'layer', title: t.cv_ce_layer_title, body: t.cv_ce_layer_body },
  ];
  const [idx, setIdx] = useState(0);
  const step = steps[idx];
  const last = idx === steps.length - 1;

  function next() {
    if (last) onDone();
    else setIdx((v) => v + 1);
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col" style={{ background: '#f2f2f6' }}>
      {/* Demo stage */}
      <div className="flex-1 flex items-center justify-center px-6 pt-8 min-h-0">
        <div className="w-full max-w-[420px] rounded-[28px] bg-white relative overflow-hidden" style={{ aspectRatio: '3 / 4', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
          <div key={step.key} className={`ce-stage ce-${step.key}`}>
            <div className="ce-anim">
              {step.key === 'layer' ? (
                // The last step is about tapping the closet, so show the closet
                // icon (not a garment) with a tap ripple.
                <span className="ce-closet">
                  <svg width="112" height="112" viewBox="0 0 24 24" fill="none" stroke="#F370A7" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="3" width="16" height="18" rx="1.7" />
                    <line x1="12" y1="3.5" x2="12" y2="20.5" />
                    <line x1="9.4" y1="11" x2="9.4" y2="13" />
                    <line x1="14.6" y1="11" x2="14.6" y2="13" />
                  </svg>
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={DEMO_IMG} alt="" className="ce-img" draggable={false} />
              )}
              {step.key === 'move' && <span className="ce-dot ce-dot-move" />}
              {step.key === 'resize' && (
                <>
                  <span className="ce-dot ce-dot-r1" />
                  <span className="ce-dot ce-dot-r2" />
                </>
              )}
              {step.key === 'layer' && <span className="ce-dot ce-dot-tap" />}
            </div>
          </div>
        </div>
      </div>

      {/* Text + controls */}
      <div className="px-8 pb-9" style={{ paddingBottom: 'max(2.25rem, env(safe-area-inset-bottom, 2.25rem))' }}>
        <div key={`tx-${step.key}`} className="ce-text">
          <h2 className="text-[26px] font-black tracking-tight text-gray-900 leading-tight">{step.title}</h2>
          <p className="text-[15.5px] text-gray-500 mt-2 leading-snug min-h-[44px]">{step.body}</p>
        </div>

        <div className="flex items-center gap-1.5 mt-5 mb-4">
          {steps.map((s, i) => (
            <span key={s.key} className="h-1.5 rounded-full transition-all duration-300" style={{ width: i === idx ? 22 : 6, background: i === idx ? '#F370A7' : '#e2c9d8' }} />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full h-14 rounded-2xl text-white text-[16px] font-bold active:scale-[0.98] transition-transform"
          style={{ background: '#F370A7' }}
        >
          {last ? t.cv_ce_done : t.cv_ce_next}
        </button>
      </div>

      <style jsx>{`
        .ce-stage { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        .ce-anim { position: relative; }
        .ce-img { width: 180px; max-width: 46vw; height: auto; display: block; object-fit: contain; }
        .ce-dot {
          position: absolute;
          width: 34px; height: 34px; border-radius: 9999px;
          background: #2f6bff;
          box-shadow: 0 0 0 10px rgba(47,107,255,0.22), 0 4px 12px rgba(47,107,255,0.4);
          pointer-events: none;
        }

        /* ── Move: image + finger glide together around the canvas ── */
        .ce-move .ce-anim { animation: ceMove 2.8s ease-in-out infinite; }
        .ce-dot-move { top: 50%; left: 50%; margin: -17px 0 0 -17px; }
        @keyframes ceMove {
          0%   { transform: translate(0, 0); }
          25%  { transform: translate(-34px, 14px); }
          50%  { transform: translate(26px, 30px); }
          75%  { transform: translate(30px, -14px); }
          100% { transform: translate(0, 0); }
        }

        /* ── Resize: image scales while two fingers pinch in/out ── */
        .ce-resize .ce-img { animation: ceScale 2.6s ease-in-out infinite; transform-origin: center; }
        @keyframes ceScale { 0%,100% { transform: scale(1); } 50% { transform: scale(0.66); } }
        .ce-dot-r1 { top: 2px; left: -8px; animation: ceR1 2.6s ease-in-out infinite; }
        .ce-dot-r2 { bottom: 2px; right: -8px; animation: ceR2 2.6s ease-in-out infinite; }
        @keyframes ceR1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(38px, 30px); } }
        @keyframes ceR2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-38px, -30px); } }

        /* ── Layer: a tap ripple + a gentle pop, hinting at add/select ── */
        .ce-layer .ce-img { animation: cePop 2.4s ease-in-out infinite; }
        .ce-closet { display: block; animation: cePop 2.4s ease-in-out infinite; }
        @keyframes cePop { 0%,100% { transform: scale(1); } 45% { transform: scale(1.06); } }
        .ce-dot-tap { top: 58%; left: 50%; margin: -17px 0 0 -17px; animation: ceTap 1.5s ease-out infinite; }
        @keyframes ceTap {
          0%   { transform: scale(0.5); opacity: 0; box-shadow: 0 0 0 0 rgba(47,107,255,0.35); }
          30%  { transform: scale(1);   opacity: 1; }
          100% { transform: scale(1);   opacity: 0; box-shadow: 0 0 0 26px rgba(47,107,255,0); }
        }

        .ce-text { animation: ceFade 0.45s ease both; }
        @keyframes ceFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

        @media (prefers-reduced-motion: reduce) {
          .ce-move .ce-anim, .ce-resize .ce-img, .ce-layer .ce-img, .ce-closet,
          .ce-dot-move, .ce-dot-r1, .ce-dot-r2, .ce-dot-tap { animation: none; }
        }
      `}</style>
    </div>
  );
}
