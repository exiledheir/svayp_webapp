import React from 'react';

/**
 * Nur's mark — the voice-bars glyph, identical to the AI Stylist tab in the
 * app's bottom bar, so the tab and the screens it opens carry one icon.
 *
 * Drawn inline rather than taken from lucide: this is Material's `graphic_eq`,
 * the exact icon the native bar renders (five square bars, symmetric short ·
 * tall · tallest · tall · short). Lucide's nearest equivalent, AudioLines, has
 * six strokes on an asymmetric profile, so it reads as a different mark.
 */
export default function NurMark({
  size = 26,
  color = 'currentColor',
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-4h2v-4h-2v4z" />
    </svg>
  );
}
