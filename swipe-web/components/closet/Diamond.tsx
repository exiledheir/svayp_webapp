import React from 'react';

/**
 * LIBAS brand gem — the in-app currency (2 diamonds = one Beautify). A faceted
 * pink brilliant-cut, ported from the Flutter onboarding `IntroDiamond`
 * (IntroPalette.gem #F370A7 / gemLight #F9A9CB / gemDeep #C94E86).
 */
export default function Diamond({ size = 16, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={glow ? { filter: 'drop-shadow(0 2px 5px rgba(243,112,167,0.45))' } : undefined}
      aria-hidden
    >
      {/* base pavilion */}
      <polygon points="30,0 70,0 100,34 50,100 0,34" fill="#C94E86" />
      {/* crown facets */}
      <polygon points="30,0 40,34 0,34" fill="#F79BC2" />
      <polygon points="70,0 100,34 60,34" fill="#F285B4" />
      {/* table (top, lightest) */}
      <polygon points="30,0 70,0 60,34 40,34" fill="#FCC3DC" />
      {/* pavilion facets */}
      <polygon points="0,34 40,34 50,100" fill="#DD6EA0" />
      <polygon points="40,34 60,34 50,100" fill="#F370A7" />
      <polygon points="60,34 100,34 50,100" fill="#C94E86" />
      {/* girdle highlight + sparkle */}
      <line x1="0" y1="34" x2="100" y2="34" stroke="#fff" strokeOpacity="0.25" strokeWidth="1.4" />
      <circle cx="40" cy="10" r="5" fill="#fff" fillOpacity="0.7" />
      {/* white rim so the gem reads clearly on coloured backgrounds (e.g. the pink pill) */}
      <polygon points="30,0 70,0 100,34 50,100 0,34" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="7" strokeLinejoin="round" />
    </svg>
  );
}
