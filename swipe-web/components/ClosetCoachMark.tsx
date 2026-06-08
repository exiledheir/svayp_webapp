import React from 'react';
import { useI18n } from '@/lib/i18n';

function BrandStarIcon({ size = 18, opacity = 1 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity }} stroke="rgb(243, 112, 167)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}

interface CoachMarkProps {
  /** 0-based step index: 0=add, 1=generate, 2=edit, 3=tryOn */
  step: number;
  /** Total number of steps */
  totalSteps?: number;
  /**
   * Bounding rect of the highlighted element (from getBoundingClientRect).
   * Pass null to center the callout without a spotlight.
   */
  targetRect: DOMRect | null;
  /** Called when the user taps "Got it →" */
  onDismiss: () => void;
}

const CALLOUT_W = 260;
const CALLOUT_H = 240; // safe upper-bound for the tallest step
const RING_PADDING = 12;
const CALLOUT_GAP = 14;  // gap between ring edge and callout

export default function ClosetCoachMark({ step, totalSteps = 4, targetRect, onDismiss }: CoachMarkProps) {
  const { t } = useI18n();

  const steps = [
    { title: t.coachAddTitle, body: t.coachAddBody },
    { title: t.coachGenerateTitle, body: t.coachGenerateBody },
    { title: t.coachEditTitle, body: t.coachEditBody },
    { title: t.coachTryOnTitle, body: t.coachTryOnBody },
  ];

  const current = steps[step] ?? steps[0];

  // Compute spotlight ring geometry
  let ringStyle: React.CSSProperties = {};
  let calloutStyle: React.CSSProperties = {};

  if (targetRect) {
    const rx = targetRect.left - RING_PADDING;
    const ry = targetRect.top - RING_PADDING;
    const rw = targetRect.width + RING_PADDING * 2;
    const rh = targetRect.height + RING_PADDING * 2;

    ringStyle = {
      position: 'fixed',
      left: rx,
      top: ry,
      width: rw,
      height: rh,
      borderRadius: 18,
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
      zIndex: 91,
      pointerEvents: 'none',
    };

    // Place callout below the ring if there's room, else above; never overlap the ring
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 812;
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 390;
    const HEADER_MIN_Y = 100; // never render callout higher than this (header safe zone)
    const spaceBelow = viewportH - (ry + rh) - CALLOUT_GAP;
    const spaceAbove = ry - CALLOUT_GAP - HEADER_MIN_Y;

    let calloutTop: number;
    if (spaceBelow >= CALLOUT_H) {
      // Enough room below — place callout under the ring
      calloutTop = ry + rh + CALLOUT_GAP;
    } else if (spaceAbove >= CALLOUT_H) {
      // Enough room above — place callout above the ring
      calloutTop = ry - CALLOUT_H - CALLOUT_GAP;
    } else {
      // Neither side fits cleanly — pin to whichever side has more space,
      // clamped so it stays fully on-screen and never overlaps the ring.
      if (spaceAbove >= spaceBelow) {
        calloutTop = Math.max(HEADER_MIN_Y, ry - CALLOUT_H - CALLOUT_GAP);
      } else {
        calloutTop = Math.min(viewportH - CALLOUT_H - 8, ry + rh + CALLOUT_GAP);
      }
    }
    // Always clamp within viewport bounds, respecting header safe zone
    calloutTop = Math.max(HEADER_MIN_Y, Math.min(calloutTop, viewportH - CALLOUT_H - 8));

    const calloutLeft = Math.max(12, Math.min(rx + rw / 2 - CALLOUT_W / 2, viewportW - CALLOUT_W - 12));

    calloutStyle = {
      position: 'fixed',
      top: calloutTop,
      left: calloutLeft,
      width: CALLOUT_W,
      zIndex: 92,
    };
  } else {
    // No target — centred callout
    calloutStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: CALLOUT_W,
      zIndex: 92,
    };
  }

  return (
    <>
      {/* Full-screen backdrop (click to dismiss) */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 90, background: 'transparent' }}
        onClick={onDismiss}
      />

      {/* Spotlight ring */}
      {targetRect && (
        <div style={ringStyle}>
          {/* Pulsing border */}
          <div
            className="absolute inset-0 rounded-[18px]"
            style={{
              border: '2.5px solid rgba(243,112,167,0.9)',
              animation: 'coachPulse 1.6s ease-in-out infinite',
            }}
          />
        </div>
      )}

      {/* Callout bubble */}
      <div
        style={calloutStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-2xl px-4 py-4"
          style={{
            background: '#fff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-2.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 16 : 6,
                  height: 6,
                  background: i === step ? '#F370A7' : '#e5e7eb',
                }}
              />
            ))}
          </div>

          <p className="text-[14px] font-bold text-gray-900 leading-snug mb-1">
            {current.title}
          </p>
          {step === 1 && (
            <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-xl" style={{ background: 'rgba(243,112,167,0.08)' }}>
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}>
                <BrandStarIcon size={18} />
              </div>
              <p className="text-[11px] text-gray-500 leading-snug">{current.body}</p>
            </div>
          )}
          {step !== 1 && (
            <p className="text-[12px] text-gray-500 leading-relaxed mb-3">
              {current.body}
            </p>
          )}

          <button
            onClick={onDismiss}
            className="w-full h-9 rounded-xl text-[13px] font-semibold text-white active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #F370A7, #e0409a)' }}
          >
            {t.coachGotIt}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes coachPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.55; transform: scale(1.04); }
        }
      `}</style>
    </>
  );
}
