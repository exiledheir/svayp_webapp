import React from 'react';
import type { ClosetItem } from '@/lib/closet-storage';
import type { SavedCanvasLayout } from '@/lib/closet-types';

interface Props {
  layout: SavedCanvasLayout;
  items: ClosetItem[];
  className?: string;
}

/**
 * Lightweight DOM preview of a flat-lay outfit. Mirrors the canvas-snapshot
 * geometry (3:4 frame, SQUARE item box 35% of the frame width, % positions,
 * scale, picture contained inside the box) so the picker / compose preview
 * matches both the editor and what captureCanvasSnapshot renders on publish.
 *
 * The square box is load-bearing: without `aspectRatio`, an <img> sized only by
 * width takes its own natural height, so tall items previewed larger than the
 * editor ever drew them.
 *
 * Images load DIRECTLY (no image proxy). This is a plain DOM <img>, not a
 * canvas, so there's no cross-origin taint to avoid — and the wardrobe blob
 * host only serves browser requests, not the proxy's server-side fetch (which
 * 404s). This matches how the closet canvas and try-on thumbnails load.
 */
export default function OutfitThumb({ layout, items, className = '' }: Props) {
  const byId = React.useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const sorted = React.useMemo(() => [...layout].sort((a, b) => a.zIndex - b.zIndex), [layout]);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: '3/4', background: '#ffffff' }}>
      {sorted.map((entry) => {
        const item = byId.get(entry.id);
        if (!item?.imageData) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={entry.id}
            src={item.imageData}
            alt=""
            style={{
              position: 'absolute',
              left: `${entry.x}%`,
              top: `${entry.y}%`,
              width: '35%',
              aspectRatio: '1',
              transform: `scale(${entry.scale})`,
              transformOrigin: 'center',
              zIndex: entry.zIndex,
              objectFit: 'contain',
            }}
          />
        );
      })}
    </div>
  );
}
