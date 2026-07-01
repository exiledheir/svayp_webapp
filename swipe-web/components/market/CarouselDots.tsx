import React from 'react';

/**
 * Page-indicator dots for an image carousel. Renders nothing for ≤1 image.
 * `variant` picks the dot colour: `light` (default) for dark/photo backgrounds,
 * `dark` for light backgrounds (e.g. the feed's white flat-lay boards).
 */
export default function CarouselDots({
  count,
  active,
  variant = 'light',
}: {
  count: number;
  active: number;
  variant?: 'light' | 'dark';
}) {
  if (count <= 1) return null;
  const dark = variant === 'dark';
  return (
    <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-10">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="rounded-full transition-all"
          style={{
            width: i === active ? 7 : 5,
            height: i === active ? 7 : 5,
            background: dark
              ? i === active
                ? 'rgba(0,0,0,0.8)'
                : 'rgba(0,0,0,0.32)'
              : i === active
                ? '#fff'
                : 'rgba(255,255,255,0.6)',
            boxShadow: dark ? '0 0 2px rgba(255,255,255,0.5)' : '0 0 2px rgba(0,0,0,0.35)',
          }}
        />
      ))}
    </div>
  );
}
