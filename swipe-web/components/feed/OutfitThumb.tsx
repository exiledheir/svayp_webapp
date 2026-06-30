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
 * geometry (3:4 frame, item width 35%, % positions, scale) so the picker /
 * compose preview matches what captureCanvasSnapshot will render on publish.
 * Uses the image proxy for remote URLs (CORS-safe), same as the snapshot.
 */
export default function OutfitThumb({ layout, items, className = '' }: Props) {
  const byId = React.useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const sorted = React.useMemo(() => [...layout].sort((a, b) => a.zIndex - b.zIndex), [layout]);

  function resolveSrc(raw: string): string {
    if (raw.startsWith('blob:') || raw.startsWith('data:')) return raw;
    return `/api/proxy-image?url=${encodeURIComponent(raw)}`;
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: '3/4', background: '#ffffff' }}>
      {sorted.map((entry) => {
        const item = byId.get(entry.id);
        if (!item?.imageData) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={entry.id}
            src={resolveSrc(item.imageData)}
            alt=""
            style={{
              position: 'absolute',
              left: `${entry.x}%`,
              top: `${entry.y}%`,
              width: '35%',
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
