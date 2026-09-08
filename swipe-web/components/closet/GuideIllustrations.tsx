import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Crown,
  Footprints,
  Heart,
  Images,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Scissors,
  Share2,
  Shirt,
  Sparkles,
  UserRound,
  Wand2,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import Diamond from '@/components/closet/Diamond';
import type { GuideIllustration } from '@/lib/closet-guide';

/**
 * Illustrations for the closet guide: small mock-ups of the screen each step talks
 * about, drawn with the same labels the live UI uses (so they follow the locale) and
 * the same colours (so they follow the theme).
 *
 * They replace screenshots, which went stale with every redesign and were unreadable
 * at phone size. Each mock shows only the one or two controls the step mentions —
 * the point is recognition («ah, that pink button»), not a faithful copy of the screen.
 *
 * Everything here is decorative: the container is aria-hidden and the bullets carry
 * the meaning.
 */

const ACCENT = '#F370A7';

interface Tone {
  dark: boolean;
  ink: string;
  sub: string;
  surface: string;
  line: string;
  soft: string;
}

export default function GuideArt({ kind, dark }: { kind: GuideIllustration; dark: boolean }) {
  const tone: Tone = {
    dark,
    ink: dark ? '#fff' : '#141118',
    sub: dark ? '#9a9aa0' : '#8f8494',
    surface: dark ? '#1c1c1e' : '#fff',
    line: dark ? '#2f2f31' : '#ece6ea',
    soft: dark ? '#262428' : '#f6f1f4',
  };
  const Art = ARTS[kind];

  // The mocks are drawn at one size (~260×230). The box they sit in follows the
  // viewport, so on a tall screen a fixed-size mock would float in a sea of pink —
  // scale it with the box instead, never past 1.5× (the strokes get chunky beyond).
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setScale(Math.max(1, Math.min(1.5, (height - 32) / 230, (width - 32) / 260)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      aria-hidden
      className="relative w-full overflow-hidden rounded-3xl flex items-center justify-center select-none"
      style={{
        background: dark
          ? 'linear-gradient(160deg, #2a1a24 0%, #171317 100%)'
          : 'linear-gradient(160deg, #fde8f2 0%, #f7f1f5 100%)',
        // Grows with the screen so the step fills a tall viewport instead of
        // leaving the bottom half blank; floored so it stays legible on short ones.
        height: 'clamp(220px, 44vh, 480px)',
      }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
        <Art tone={tone} />
      </div>
    </div>
  );
}

// ── Building blocks ────────────────────────────────────────────────────────

function Card({ tone, className = '', style, children }: { tone: Tone; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: tone.surface,
        boxShadow: tone.dark ? '0 6px 20px rgba(0,0,0,0.35)' : '0 6px 20px rgba(120,60,90,0.12)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PinkPill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 h-8 px-3.5 rounded-full text-[12px] font-bold text-white whitespace-nowrap ${className}`}
      style={{ background: ACCENT, boxShadow: '0 4px 12px rgba(243,112,167,0.35)' }}
    >
      {children}
    </span>
  );
}

function GreyPill({ tone, children, className = '' }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 h-8 px-3.5 rounded-full text-[12px] font-bold whitespace-nowrap ${className}`}
      style={{ background: tone.soft, color: tone.ink }}
    >
      {children}
    </span>
  );
}

/** Category / source chip. `active` = black pill, as on the closet page. */
function Chip({ tone, active = false, children }: { tone: Tone; active?: boolean; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{
        background: active ? tone.ink : tone.surface,
        color: active ? tone.surface : tone.ink,
        border: `1px solid ${active ? tone.ink : tone.line}`,
      }}
    >
      {children}
    </span>
  );
}

/** Grey placeholder line standing in for text. */
function Bar({ tone, w, h = 6 }: { tone: Tone; w: number; h?: number }) {
  return <span className="block rounded-full" style={{ width: w, height: h, background: tone.line }} />;
}

/** Trousers glyph in the lucide stroke style — lucide has a shirt and shoes, but no trousers. */
function PantsGlyph({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l1 18h-5l-2-9-2 9H5L6 3z" />
      <path d="M6 7h12" />
    </svg>
  );
}

type GarmentKind = 'top' | 'bottom' | 'shoes';

function Garment({ kind, size = 24, color }: { kind: GarmentKind; size?: number; color: string }) {
  if (kind === 'top') return <Shirt size={size} color={color} strokeWidth={1.8} />;
  if (kind === 'bottom') return <PantsGlyph size={size} color={color} />;
  return <Footprints size={size} color={color} strokeWidth={1.8} />;
}

/** Square wardrobe tile with one garment, optionally selected (pink ring). */
function Tile({ tone, kind, selected = false, badge }: { tone: Tone; kind: GarmentKind; selected?: boolean; badge?: React.ReactNode }) {
  return (
    <span
      className="relative flex items-center justify-center rounded-xl aspect-square"
      style={{
        background: selected ? (tone.dark ? 'rgba(243,112,167,0.14)' : '#fdeef6') : tone.soft,
        border: `1.5px solid ${selected ? ACCENT : 'transparent'}`,
      }}
    >
      <Garment kind={kind} size={26} color={selected ? ACCENT : tone.ink} />
      {badge && <span className="absolute -top-1.5 -right-1.5">{badge}</span>}
    </span>
  );
}

function Badge({ children, color = ACCENT }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="flex items-center justify-center w-5 h-5 rounded-full text-white" style={{ background: color, boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }}>
      {children}
    </span>
  );
}

/** Segmented control, as ClosetSectionTabs draws it. */
function Segmented({ tone, items, active }: { tone: Tone; items: string[]; active: number }) {
  return (
    <span className="inline-flex p-1 rounded-full gap-1" style={{ background: tone.dark ? '#1f1f1f' : '#F1F1F3' }}>
      {items.map((label, i) => (
        <span
          key={label}
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
          style={{
            background: i === active ? tone.surface : 'transparent',
            color: i === active ? ACCENT : tone.sub,
            boxShadow: i === active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          {label}
        </span>
      ))}
    </span>
  );
}

// ── Steps ──────────────────────────────────────────────────────────────────

/** Add clothes: source chips, a batch of photos mid-processing, the pink «Add item». */
function AddArt({ tone }: { tone: Tone }) {
  const { t } = useI18n();
  return (
    <div className="w-[248px] flex flex-col gap-2.5">
      <div className="flex gap-1.5">
        <Chip tone={tone} active><Images size={12} />{t.cv_src_gallery}</Chip>
        <Chip tone={tone}><Camera size={12} />{t.cv_src_camera}</Chip>
      </div>
      <Card tone={tone} className="p-2.5">
        <div className="grid grid-cols-3 gap-2">
          <Tile tone={tone} kind="top" badge={<Badge><Check size={12} strokeWidth={3} /></Badge>} />
          <Tile tone={tone} kind="bottom" selected badge={<Badge><Scissors size={11} strokeWidth={2.5} /></Badge>} />
          <Tile tone={tone} kind="shoes" />
        </div>
        <p className="mt-2 text-[10.5px] font-semibold truncate" style={{ color: tone.sub }}>{t.cv_proc_removing}</p>
      </Card>
      <PinkPill className="self-center"><Plus size={14} strokeWidth={2.6} />{t.cv_add_item}</PinkPill>
    </div>
  );
}

/** Beautify: the before/after pair and the button that runs it. */
function BeautifyArt({ tone }: { tone: Tone }) {
  const { t } = useI18n();
  const busy = tone.dark
    ? 'repeating-linear-gradient(135deg, #3a3237 0 6px, #2b252a 6px 12px)'
    : 'repeating-linear-gradient(135deg, #e6dde2 0 6px, #d8cdd4 6px 12px)';
  return (
    <div className="w-[252px] flex flex-col gap-2.5 items-center">
      <div className="grid grid-cols-2 gap-2.5 w-full">
        <Card tone={tone} className="p-1.5 flex flex-col items-center gap-1.5">
          <span className="w-full aspect-[4/5] rounded-xl flex items-center justify-center" style={{ background: busy }}>
            <Garment kind="top" size={40} color={tone.sub} />
          </span>
          <span className="text-[10.5px] font-semibold" style={{ color: tone.sub }}>{t.cv_dt_original}</span>
        </Card>
        <Card tone={tone} className="p-1.5 flex flex-col items-center gap-1.5" style={{ border: `1.5px solid ${ACCENT}` }}>
          <span className="relative w-full aspect-[4/5] rounded-xl flex items-center justify-center" style={{ background: tone.dark ? '#111' : '#fff', border: `1px solid ${tone.line}` }}>
            <Garment kind="top" size={40} color={ACCENT} />
            <span className="absolute top-1.5 right-1.5"><Badge><Sparkles size={11} /></Badge></span>
          </span>
          <span className="text-[10.5px] font-bold" style={{ color: ACCENT }}>{t.cv_dt_beautified}</span>
        </Card>
      </div>
      <PinkPill><Wand2 size={13} />{t.cv_bt_button}<Diamond size={12} /></PinkPill>
    </div>
  );
}

/** The closet grid: category chips, tiles, and the detail row of the selected item. */
function ClosetArt({ tone }: { tone: Tone }) {
  const { t } = useI18n();
  return (
    <div className="w-[252px] flex flex-col gap-2">
      <div className="flex gap-1.5 overflow-hidden">
        <Chip tone={tone} active>{t.all} <span className="opacity-60">12</span></Chip>
        <Chip tone={tone}>{t.upperBody}</Chip>
        <Chip tone={tone}>{t.lowerBody}</Chip>
      </div>
      <Card tone={tone} className="p-2.5">
        <div className="grid grid-cols-3 gap-2">
          <Tile tone={tone} kind="top" selected />
          <Tile tone={tone} kind="bottom" />
          <Tile tone={tone} kind="shoes" />
          <Tile tone={tone} kind="top" />
          <Tile tone={tone} kind="bottom" />
          <Tile tone={tone} kind="top" />
        </div>
        <div className="mt-2.5 pt-2.5 flex items-center gap-2" style={{ borderTop: `1px solid ${tone.line}` }}>
          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: '#3b4a8a', border: `2px solid ${tone.surface}`, boxShadow: `0 0 0 1px ${tone.line}` }} />
          <span className="flex flex-col gap-1.5 flex-1 min-w-0">
            <Bar tone={tone} w={78} />
            <Bar tone={tone} w={48} h={5} />
          </span>
          <PinkPill className="!h-7 !px-3 text-[11px]">{t.cv_dt_tryon}</PinkPill>
        </div>
      </Card>
    </div>
  );
}

/** A board: the flat-lay outfit, the ✦ generate button, Edit and Try it on. */
function BoardsArt({ tone }: { tone: Tone }) {
  const { t } = useI18n();
  return (
    <div className="w-[240px] flex flex-col gap-2">
      <Chip tone={tone}><RefreshCw size={11} />{t.regenerateWithAI}</Chip>
      <Card tone={tone} className="relative p-3 pt-4">
        <span
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: tone.dark ? 'rgba(243,112,167,0.16)' : '#fdeef6', border: `1px solid ${tone.dark ? 'rgba(243,112,167,0.32)' : '#F8D3E4'}` }}
        >
          <Sparkles size={15} color={ACCENT} />
        </span>
        <div className="flex flex-col items-center gap-0.5 py-1">
          <span style={{ transform: 'rotate(-6deg)' }}><Garment kind="top" size={46} color={tone.ink} /></span>
          <Garment kind="bottom" size={44} color={tone.ink} />
          <Garment kind="shoes" size={24} color={tone.sub} />
        </div>
        <div className="flex gap-2 mt-2">
          <GreyPill tone={tone} className="flex-1"><Pencil size={12} />{t.viewItems}</GreyPill>
          <PinkPill className="flex-1">{t.tryItOn}</PinkPill>
        </div>
      </Card>
    </div>
  );
}

/** Try-on: the mannequin / my-photo choice and the progress of a run. */
function TryOnArt({ tone }: { tone: Tone }) {
  const { t } = useI18n();
  const option = (icon: React.ReactNode, label: string, selected: boolean) => (
    <Card
      tone={tone}
      className="p-2.5 flex flex-col items-center gap-1.5 text-center"
      style={{ border: `1.5px solid ${selected ? ACCENT : 'transparent'}`, background: selected ? (tone.dark ? 'rgba(243,112,167,0.12)' : '#fdeef6') : tone.surface }}
    >
      <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: selected ? ACCENT : tone.soft, color: selected ? '#fff' : tone.ink }}>
        {icon}
      </span>
      <span className="text-[11px] font-bold leading-tight" style={{ color: selected ? ACCENT : tone.ink }}>{label}</span>
    </Card>
  );
  return (
    <div className="w-[252px] flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        {option(<UserRound size={18} />, t.tryOnTargetMannequin, false)}
        {option(<Camera size={18} />, t.tryOnTargetSelf, true)}
      </div>
      <Card tone={tone} className="p-2.5 flex items-center gap-2.5">
        <span className="w-8 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: tone.soft }}>
          <UserRound size={18} color={tone.sub} />
        </span>
        <span className="flex-1 flex flex-col gap-1.5">
          <span className="block h-1.5 rounded-full overflow-hidden" style={{ background: tone.line }}>
            <span className="block h-full rounded-full" style={{ width: '62%', background: ACCENT }} />
          </span>
          <span className="text-[10.5px] font-semibold" style={{ color: tone.sub }}>30–60 s</span>
        </span>
        <PinkPill className="!h-7 !px-3 text-[11px]">{t.tryItOn}</PinkPill>
      </Card>
    </div>
  );
}

/** Outfits gallery + calendar strip under the section tabs. */
function LooksArt({ tone }: { tone: Tone }) {
  const { t } = useI18n();
  // Monday-first week, as the calendar tab shows it.
  const days = [1, 2, 3, 4, 5, 6, 0].map((i) => t.dayNames[i]);
  return (
    <div className="w-[256px] flex flex-col items-center gap-2.5">
      <Segmented tone={tone} items={[t.tabBoards, t.tabOutfits, t.tabCalendar]} active={1} />
      <div className="grid grid-cols-2 gap-2 w-full">
        {[0, 1].map((i) => (
          <Card key={i} tone={tone} className="relative h-[64px] flex items-center justify-center">
            <UserRound size={30} color={i === 0 ? ACCENT : tone.ink} strokeWidth={1.6} />
            <span className="absolute bottom-1.5 right-1.5"><Badge color={i === 0 ? ACCENT : tone.sub}><Share2 size={10} /></Badge></span>
          </Card>
        ))}
      </div>
      <Card tone={tone} className="w-full p-2 flex items-center gap-1.5">
        <span className="flex-1 grid grid-cols-7 gap-1">
          {days.map((d, i) => (
            <span
              key={d}
              className="flex flex-col items-center gap-0.5 rounded-lg py-1 text-[9.5px] font-bold"
              style={{ background: i === 2 ? ACCENT : 'transparent', color: i === 2 ? '#fff' : tone.sub }}
            >
              {d.slice(0, 2)}
              <span className="w-1 h-1 rounded-full" style={{ background: i === 2 ? '#fff' : tone.line }} />
            </span>
          ))}
        </span>
        <Chip tone={tone}><RefreshCw size={10} />{t.cl_cal_shuffle}</Chip>
      </Card>
    </div>
  );
}

/** A feed post: author, the look, likes/comments, and the share button. */
function FeedArt({ tone }: { tone: Tone }) {
  const { t } = useI18n();
  return (
    <div className="w-[232px] flex flex-col items-center gap-2.5">
      <Card tone={tone} className="w-full overflow-hidden">
        <div className="p-2.5 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg,#F9A9CB,#F370A7)' }} />
          <span className="flex flex-col gap-1.5">
            <Bar tone={tone} w={70} />
            <Bar tone={tone} w={40} h={5} />
          </span>
        </div>
        <div className="h-[84px] flex items-center justify-center gap-3" style={{ background: tone.soft }}>
          <Garment kind="top" size={36} color={tone.ink} />
          <Garment kind="bottom" size={34} color={tone.ink} />
        </div>
        <div className="p-2.5 flex items-center gap-3 text-[11px] font-bold" style={{ color: tone.ink }}>
          <span className="flex items-center gap-1"><Heart size={15} color={ACCENT} fill={ACCENT} />24</span>
          <span className="flex items-center gap-1"><MessageCircle size={15} />3</span>
          <span className="ml-auto flex items-center gap-1 text-[10.5px]" style={{ color: ACCENT }}>{t.feed_follow}</span>
        </div>
      </Card>
      <PinkPill><Share2 size={13} />{t.cl_share_feed}</PinkPill>
    </div>
  );
}

/** The header pill and the billing sheet with its two tabs. */
function DiamondsArt({ tone }: { tone: Tone }) {
  const { t } = useI18n();
  const packs: [number, string | null][] = [[100, null], [200, '−30%'], [500, '−30%']];
  return (
    <div className="w-[252px] flex flex-col items-center gap-2.5">
      <span
        className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full text-[13px] font-extrabold"
        style={{
          background: tone.dark ? 'rgba(243,112,167,0.16)' : '#fdeef6',
          border: `1px solid ${tone.dark ? 'rgba(243,112,167,0.32)' : '#F8D3E4'}`,
          color: tone.dark ? '#F5EAF0' : '#B03A72',
        }}
      >
        <Diamond size={16} />10
        <span className="w-px h-3.5" style={{ background: tone.dark ? 'rgba(243,112,167,0.32)' : '#F1BFD8' }} />
        <Crown size={15} />
      </span>
      <Card tone={tone} className="w-full p-2.5 flex flex-col gap-2.5">
        <span className="flex p-1 rounded-xl gap-1" style={{ background: tone.soft }}>
          <span className="flex-1 h-7 rounded-lg flex items-center justify-center gap-1 text-[11px] font-extrabold" style={{ background: tone.surface, color: tone.ink, border: `1px solid ${tone.dark ? 'rgba(243,112,167,0.32)' : '#F8D3E4'}` }}>
            <Diamond size={12} />{t.cn_title}
          </span>
          <span className="flex-1 h-7 rounded-lg flex items-center justify-center gap-1 text-[11px] font-extrabold" style={{ color: tone.sub }}>
            <Crown size={12} />{t.pl_title}
          </span>
        </span>
        <div className="grid grid-cols-3 gap-2">
          {packs.map(([n, off], i) => (
            <span
              key={n}
              className="relative flex flex-col items-center gap-0.5 rounded-xl py-2.5"
              style={{
                border: `1.5px solid ${i === 0 ? ACCENT : tone.line}`,
                background: i === 0 ? (tone.dark ? 'rgba(243,112,167,0.12)' : '#fdeef6') : 'transparent',
              }}
            >
              {off && (
                <span className="absolute -top-2 px-1.5 py-px rounded-full text-[8.5px] font-extrabold text-white" style={{ background: ACCENT }}>{off}</span>
              )}
              <Diamond size={16} glow={i === 0} />
              <span className="text-[12px] font-extrabold" style={{ color: tone.ink }}>{n}</span>
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

const ARTS: Record<GuideIllustration, (props: { tone: Tone }) => React.JSX.Element> = {
  add: AddArt,
  beautify: BeautifyArt,
  closet: ClosetArt,
  boards: BoardsArt,
  tryon: TryOnArt,
  looks: LooksArt,
  feed: FeedArt,
  diamonds: DiamondsArt,
};
