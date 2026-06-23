import React from 'react';

/** Page-indicator dots for an image carousel. Renders nothing for ≤1 image. */
export default function CarouselDots({ count, active }: { count: number; active: number }) {
  if (count <= 1) return null;
  return (
    <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-10">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="rounded-full transition-all"
          style={{
            width: i === active ? 7 : 5,
            height: i === active ? 7 : 5,
            background: i === active ? '#fff' : 'rgba(255,255,255,0.6)',
            boxShadow: '0 0 2px rgba(0,0,0,0.35)',
          }}
        />
      ))}
    </div>
  );
}
