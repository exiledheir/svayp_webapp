import React from 'react';
import { ImagePlus, RefreshCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { ClosetItem } from '@/lib/closet-storage';
import type { SelectedSource } from '@/lib/feed-publish';
import OutfitThumb from '@/components/feed/OutfitThumb';

interface Props {
  boards: SelectedSource[];
  outfits: SelectedSource[];
  library: SelectedSource[];
  selectedKeys: string[]; // ordered selection (for badges)
  onToggle: (s: SelectedSource) => void;
  onAddLibraryPhoto: (file: File) => void;
  onRefresh: () => void;
  items: ClosetItem[];
  loading: boolean;
}

// Pull-to-refresh tuning (px). PULL_MAX caps the rubber-band; PULL_THRESHOLD is
// how far you drag before release fires a refresh; RESISTANCE damps the drag.
const PULL_MAX = 90;
const PULL_THRESHOLD = 60;
const RESISTANCE = 0.5;

export interface SourcePickerHandle {
  focusOutfits: () => void;
}

/**
 * Source picker for publishing. Three fixed columns sit side by side — Boards,
 * Outfits, Library — each with its header and its sources stacked vertically
 * underneath. The whole picker scrolls down only (no sideways scrolling), so the
 * user reads all three types at a glance and scrolls through the longest column.
 * Multi-select across columns; selection lives in the parent so the order badge
 * shows carousel position. The Library column leads with an "Add photo" tile that
 * pulls an image from the device gallery.
 */
const SourcePicker = React.forwardRef<SourcePickerHandle, Props>(function SourcePicker(
  { boards, outfits, library, selectedKeys, onToggle, onAddLibraryPhoto, onRefresh, items, loading },
  ref,
) {
  const { t } = useI18n();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Pull-to-refresh: drag down from the top to refresh (replaces the header sync
  // button). `pull` is the live drag distance; `refreshing` pins the spinner
  // while the parent reloads, clearing once `loading` drops back to false.
  const [pull, setPull] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const startY = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (refreshing && !loading) setRefreshing(false);
  }, [refreshing, loading]);

  function onTouchStart(e: React.TouchEvent) {
    // Only arm a pull when already scrolled to the very top.
    startY.current = (scrollRef.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && (scrollRef.current?.scrollTop ?? 0) <= 0) {
      setPull(Math.min(PULL_MAX, dy * RESISTANCE));
    } else {
      setPull(0);
    }
  }
  function onTouchEnd() {
    if (pull >= PULL_THRESHOLD && !loading) {
      setRefreshing(true);
      onRefresh();
    }
    setPull(0);
    startY.current = null;
  }

  // Spinner offset: pinned at the threshold while refreshing, else follows the drag.
  const offset = refreshing ? PULL_THRESHOLD : pull;

  // The try-on nudge calls this to draw the eye to the Outfits column. All three
  // columns share one vertical scroll, so this just returns to the top.
  React.useImperativeHandle(ref, () => ({
    focusOutfits: () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }),
  }));

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onAddLibraryPhoto(file);
    e.target.value = ''; // allow re-picking the same file
  }

  function Thumb({ s }: { s: SelectedSource }) {
    const order = selectedKeys.indexOf(s.key);
    const selected = order >= 0;
    return (
      <button
        onClick={() => onToggle(s)}
        className="relative w-full rounded-xl overflow-hidden"
        style={{
          aspectRatio: '3/4',
          // Boards are flat-lay cut-outs on white (matches the closet board cards).
          background: s.sourceType === 'board' ? '#ffffff' : undefined,
          outline: selected ? '2px solid #F370A7' : '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {s.sourceType === 'tryon' || s.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.sourceType === 'tryon' ? s.resultImageUrl : s.previewUrl!}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : s.layout ? (
          <OutfitThumb layout={s.layout} items={s.items ?? items} className="w-full h-full" />
        ) : (
          <div className="w-full h-full bg-black/5 dark:bg-white/10" />
        )}

        {selected ? (
          <span
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-[12px] font-bold"
            style={{ background: '#F370A7' }}
          >
            {order + 1}
          </span>
        ) : (
          <span
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full"
            style={{ border: '1.5px solid rgba(255,255,255,0.9)', background: 'rgba(0,0,0,0.15)' }}
          />
        )}
      </button>
    );
  }

  const addTile = (
    <button
      onClick={() => fileRef.current?.click()}
      className="w-full flex flex-col items-center justify-center gap-1.5 rounded-xl text-black/45 dark:text-white/45"
      style={{ aspectRatio: '3/4', border: '1.5px dashed rgba(0,0,0,0.20)' }}
    >
      <ImagePlus size={20} />
      <span className="text-[10.5px] font-medium">{t.feed_lib_add}</span>
    </button>
  );

  function Column({
    label,
    list,
    leading,
  }: {
    label: string;
    list: SelectedSource[];
    leading?: React.ReactNode;
  }) {
    return (
      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="pb-2 text-[13px] font-bold text-black dark:text-white">{label}</h3>
        <div className="flex flex-col gap-2.5">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-full rounded-xl bg-black/5 dark:bg-white/10 animate-pulse"
                style={{ aspectRatio: '3/4' }}
              />
            ))
          ) : (
            <>
              {leading}
              {list.map((s) => (
                <Thumb key={s.key} s={s} />
              ))}
              {!leading && list.length === 0 && (
                <p className="text-[12px] text-black/40 dark:text-white/40">{t.feed_section_empty}</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden">
      {/* Pull-to-refresh spinner, pinned to the visible top */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-end justify-center overflow-hidden"
        style={{ height: offset }}
      >
        <RefreshCw
          size={20}
          className={`mb-2 text-black/45 dark:text-white/45 ${refreshing ? 'animate-spin' : ''}`}
          style={refreshing ? undefined : { transform: `rotate(${(offset / PULL_THRESHOLD) * 180}deg)` }}
        />
      </div>

      <div
        ref={scrollRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="h-full overflow-y-auto overflow-x-hidden pb-3"
        style={{ overscrollBehaviorY: 'contain' }}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

        <div
          style={{ transform: `translateY(${offset}px)`, transition: pull > 0 ? 'none' : 'transform 0.2s ease' }}
        >
          <div className="flex items-start gap-2.5 px-4 pt-4">
            <Column label={t.tabBoards} list={boards} />
            <Column label={t.tabOutfits} list={outfits} />
            <Column label={t.feed_src_library} list={library} leading={addTile} />
          </div>
        </div>
      </div>
    </div>
  );
});

export default SourcePicker;
