import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const IMG = {
  original: '/images/onboarding/beautify/original.png',
  beautified: '/images/onboarding/beautify/beautifed.jpeg',
  garment: '/images/onboarding/try_it_on/try_on.png',
  mannequin: '/images/onboarding/try_it_on/on_mannequin.png',
  onMe: '/images/onboarding/try_it_on/on_my_photo.png',
  onMeCovered: '/images/onboarding/try_it_on/on_my_photo_covered.png',
};

/**
 * Build-your-closet gate showcase — auto-cycling "[source] → [result]" demos of
 * the headline features: AI background cut-out and Try-it-on (mannequin / your
 * photo / modest). Each slide animates the source in, the arrow flows, then the
 * result pops in. Purely decorative.
 */
export default function ClosetGateShowcase({ dark }: { dark: boolean }) {
  const { t } = useI18n();
  const slides = [
    { src: IMG.original, res: IMG.beautified, title: t.cv_show_bt_title, caption: t.cv_show_bt_cap },
    { src: IMG.garment, res: IMG.mannequin, title: t.cv_show_to_title, caption: t.cv_show_to_mannequin },
    { src: IMG.garment, res: IMG.onMe, title: t.cv_show_to_title, caption: t.cv_show_to_me },
    { src: IMG.garment, res: IMG.onMeCovered, title: t.cv_show_to_title, caption: t.cv_show_to_covered },
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((v) => (v + 1) % slides.length), 3400);
    return () => clearInterval(id);
  }, [slides.length]);

  const s = slides[idx];
  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#b7a6b3' : '#8a7f88';
  const panelBg = dark ? '#141014' : '#ffffff';
  const panelBorder = dark ? 'rgba(255,255,255,0.07)' : '#efe4ec';

  const panelStyle = { width: 118, height: 158, background: panelBg, border: `1px solid ${panelBorder}` };

  return (
    <div className="px-5 pt-1 pb-4">
      <div key={idx} className="flex items-center justify-center gap-2">
        {/* Source */}
        <div className="sc-src rounded-2xl overflow-hidden flex items-center justify-center" style={panelStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.src} alt="" className="w-full h-full object-cover" style={{ objectPosition: 'top center' }} />
        </div>
        {/* Arrow */}
        <div className="sc-arrow flex-none w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F370A7', boxShadow: '0 4px 12px -4px rgba(243,112,167,0.7)' }}>
          <ArrowRight size={17} color="#fff" strokeWidth={2.6} />
        </div>
        {/* Result + sparkle */}
        <div className="relative">
          <div className="sc-res rounded-2xl overflow-hidden flex items-center justify-center" style={panelStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.res} alt="" className="w-full h-full object-cover" style={{ objectPosition: 'top center' }} />
          </div>
          <span className="sc-spark absolute -top-1.5 -right-1.5">
            <Sparkles size={18} color="#F370A7" style={{ filter: 'drop-shadow(0 1px 3px rgba(243,112,167,0.5))' }} />
          </span>
        </div>
      </div>

      <div key={`t${idx}`} className="sc-text text-center mt-3.5 px-3">
        <p className="text-[15.5px] font-extrabold" style={{ color: ink }}>{s.title}</p>
        <p className="text-[12.5px] mt-1 leading-snug" style={{ color: sub }}>{s.caption}</p>
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-3">
        {slides.map((_, i) => (
          <span key={i} className="rounded-full transition-all duration-300" style={{ width: i === idx ? 18 : 6, height: 6, background: i === idx ? '#F370A7' : (dark ? '#3a3a3c' : '#e2dbe1') }} />
        ))}
      </div>

      <style jsx>{`
        .sc-src   { animation: scSrc 0.55s ease-out both; }
        .sc-res   { animation: scRes 0.6s ease-out 0.45s both; }
        .sc-arrow { animation: scArrow 1.4s ease-in-out infinite; }
        .sc-spark { animation: scSpark 0.6s ease-out 0.55s both; }
        .sc-text  { animation: scFade 0.5s ease-out both; }
        @keyframes scSrc { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }
        @keyframes scRes { 0% { opacity: 0; transform: translateX(14px) scale(0.92); } 100% { opacity: 1; transform: none; } }
        @keyframes scArrow { 0%, 100% { transform: translateX(0); opacity: 0.75; } 50% { transform: translateX(4px); opacity: 1; } }
        @keyframes scSpark { 0% { opacity: 0; transform: scale(0.4) rotate(-20deg); } 60% { opacity: 1; transform: scale(1.15) rotate(8deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
        @keyframes scFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .sc-src, .sc-res, .sc-arrow, .sc-spark, .sc-text { animation: none; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
