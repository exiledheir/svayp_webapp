import React, { useState } from 'react';
import Image from 'next/image';
import { Footprints, Gem, Glasses, Shirt } from 'lucide-react';
import { MARKET_BROWSE_GROUPS, browseGroupLabel } from '@/lib/market-attributes';
import { browseGroupImageSrc } from '@/lib/market-category-images';
import type { Locale } from '@/lib/translations';

/**
 * Market category rail — a horizontal strip of circular "product disc" buttons
 * (cut-out photo on a soft gradient) with the localized label underneath, so a
 * category is recognized by sight rather than read. Replaces the old text-only
 * pill row; one row deep on purpose, so listings stay above the fold.
 *
 * Browses by group (see MARKET_BROWSE_GROUPS) rather than by all 28 postable
 * categories — a shopper scans ten discs instead of scrolling through
 * twenty-eight, and there are ten photos to produce instead of twenty-eight.
 */

const PINK = '#F370A7';

interface Props {
  /** Selected browse-group id, or null for "all categories". */
  value: string | null;
  onChange: (groupId: string | null) => void;
  /** Localized "All categories" label (t.mk_all_categories). */
  allLabel: string;
  locale: Locale;
  isDark: boolean;
}

export default function CategoryRail({ value, onChange, allLabel, locale, isDark }: Props) {
  return (
    <div
      className="hide-scrollbar flex gap-0.5 overflow-x-auto pb-3 pt-1.5"
      // Extra side padding over the page's px-4 so the selected ring never gets
      // clipped by the scroll container at either end.
      style={{ paddingLeft: 12, paddingRight: 12 }}
    >
      <CategoryBubble
        label={allLabel}
        active={value === null}
        isDark={isDark}
        onClick={() => onChange(null)}
        glyph={<AllGlyph />}
        /* "All" has no product photo — it wears the brand gradient instead, so
           it reads as a distinct entry point rather than a missing image. */
        discBackground="linear-gradient(150deg,#F370A7 0%,#F2994A 100%)"
      />
      {MARKET_BROWSE_GROUPS.map((group) => (
        <CategoryBubble
          key={group.id}
          label={browseGroupLabel(group, locale)}
          active={value === group.id}
          isDark={isDark}
          onClick={() => onChange(group.id)}
          src={group.iconOnly ? undefined : browseGroupImageSrc(group.id)}
          glyph={<GroupGlyph id={group.id} />}
        />
      ))}
    </div>
  );
}

function CategoryBubble({
  label,
  active,
  isDark,
  onClick,
  src,
  glyph,
  discBackground,
}: {
  label: string;
  active: boolean;
  isDark: boolean;
  onClick: () => void;
  src?: string;
  glyph: React.ReactNode;
  discBackground?: string;
}) {
  // A group whose cut-out is missing 404s once, then shows its glyph for the
  // rest of the session. (Groups that are icon-only by design pass no src at
  // all, so they never make the request.)
  const [failed, setFailed] = useState(false);
  const showPhoto = !!src && !failed;

  const idleDisc = isDark
    ? 'linear-gradient(150deg,rgba(255,255,255,0.11) 0%,rgba(255,255,255,0.04) 100%)'
    : 'linear-gradient(150deg,#F8E5EF 0%,#FDF4EE 100%)';

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="shrink-0 flex w-[74px] flex-col items-center gap-1.5 pt-0.5 active:scale-95 transition-transform"
    >
      <div
        className="relative flex h-[66px] w-[66px] items-center justify-center overflow-hidden rounded-full"
        style={{
          background: discBackground ?? idleDisc,
          // Ring sits off the disc with a page-coloured gap, so it reads as a
          // selection ring rather than a border drawn on the artwork.
          boxShadow: active
            ? `0 0 0 2px ${isDark ? '#111111' : '#ffffff'}, 0 0 0 4px ${PINK}`
            : undefined,
        }}
      >
        {showPhoto ? (
          <Image
            src={src!}
            alt=""
            fill
            sizes="66px"
            // Served straight from /public: already small and sized for the
            // disc, so the optimizer would only add a round trip — and a group
            // whose cut-out doesn't exist yet 404s cheaply into the glyph
            // fallback instead of stalling in /_next/image.
            unoptimized
            className="object-contain p-[9px]"
            onError={() => setFailed(true)}
          />
        ) : (
          <span
            aria-hidden
            style={{
              color: discBackground
                ? '#ffffff'
                : isDark
                  ? 'rgba(255,255,255,0.5)'
                  : 'rgba(0,0,0,0.42)',
            }}
          >
            {glyph}
          </span>
        )}
      </div>
      <span
        className="line-clamp-2 w-full text-center text-[10.5px] leading-[1.22]"
        style={{
          color: active
            ? isDark
              ? '#ffffff'
              : '#000000'
            : isDark
              ? 'rgba(255,255,255,0.6)'
              : 'rgba(0,0,0,0.56)',
          fontWeight: active ? 700 : 500,
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ── Glyphs ──────────────────────────────────────────────────────────────────
// One garment outline per browse group. Accessories wears one permanently —
// glasses and belts have too little in common to photograph as one product —
// and the rest stand in for any cut-out that hasn't been produced yet. Tops,
// shoes, jewelry and accessories borrow lucide's own icons; the others are
// drawn to match it (24×24, 1.7 stroke, round joins), since lucide has no
// trousers, dress, coat, handbag, hijab or briefs.

// Sized to carry the same optical weight as the cut-out photos beside them,
// which fill most of the disc's 48px content box.
const GLYPH = 32;

const GLYPH_PATHS: Record<string, string[]> = {
  bottoms: ['M6.2 3.2 h11.6 l.9 17.6 h-4.9 L12 10.4 l-1.8 10.4 H5.3 Z', 'M6.1 6.8 h11.8'],
  dresses: [
    'M9 3.5 L12 6 L15 3.5 l2.6 2.2 -1.7 3.9 L15 13.2 L19.6 21 H4.4 L9 13.2 L7.1 9.6 L5.4 5.7 Z',
  ],
  outerwear: [
    'M8.5 3.5 L4 5.5 L2.8 11 l2.7 .9 V20.5 h13 V11.9 l2.7-.9 L20 5.5 L15.5 3.5 L12 7.5 Z',
    'M12 7.5 V20.5',
  ],
  bags: ['M5.5 8 h13 l1 12.5 h-15 Z', 'M9 8 V6 a3 3 0 0 1 6 0 v2'],
  // Covered head over shoulders — the wide base is what keeps this reading as a
  // person in a headscarf rather than as a map pin.
  hijab: [
    'M12 2.6 a6.4 6.4 0 0 0-6.4 6.4 c0 2 .5 3.1 1 4.2 l-4.1 2.9 v4.9 h19 v-4.9 l-4.1-2.9 c.5-1.1 1-2.2 1-4.2 A6.4 6.4 0 0 0 12 2.6 Z',
    'M12 5.9 c-1.9 0-3.5 1.8-3.5 4.1 s1.6 4.1 3.5 4.1 3.5-1.8 3.5-4.1 S13.9 5.9 12 5.9 Z',
  ],
  underwear: ['M4 7.5 h16 l-.8 4.2 -4.6 2.4 L12 19 l-2.6-4.9 -4.6-2.4 Z'],
};

function GroupGlyph({ id }: { id: string }) {
  if (id === 'tops') return <Shirt size={GLYPH} strokeWidth={1.7} />;
  if (id === 'shoes') return <Footprints size={GLYPH} strokeWidth={1.7} />;
  if (id === 'jewelry') return <Gem size={GLYPH} strokeWidth={1.7} />;
  if (id === 'accessories') return <Glasses size={GLYPH} strokeWidth={1.7} />;
  const paths = GLYPH_PATHS[id] ?? GLYPH_PATHS.bags;
  return (
    <svg
      width={GLYPH}
      height={GLYPH}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** "All categories" — four garment discs arranged as a grid. */
function AllGlyph() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="8" cy="8" r="3.4" />
      <circle cx="16" cy="8" r="3.4" />
      <circle cx="8" cy="16" r="3.4" />
      <circle cx="16" cy="16" r="3.4" />
    </svg>
  );
}
