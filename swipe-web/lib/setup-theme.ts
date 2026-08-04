/**
 * Design tokens for the first-run closet setup screen.
 *
 * Deliberately light-only and independent of the app's theme: setup is a
 * one-time blocking screen and the handoff specifies exact values. `sub` is
 * #6E6E78 rather than the app's lighter grey because body copy has to clear
 * 4.5:1 against white.
 */
export const SU = {
  pink: '#ED3D8E',
  pinkPressed: '#D62F7D',
  /** Empty-slot fill. */
  pinkTint: '#FFF8FB',
  /** Empty-slot dashed border. */
  pinkBorder: '#F2A9CB',
  pinkSoft: '#FFF3F8',
  pinkSoftBorder: '#FADCEA',
  ink: '#101014',
  sub: '#6E6E78',
  /** Secondary text sitting on the pink tint. */
  mutedOnTint: '#7E6F77',
  surface: '#F4F4F7',
  hairline: '#E7E7EC',
  success: '#16A45C',
  successBg: '#F5FCF8',
  successBorder: '#DDE5DF',
  successSub: '#6F7A73',
  successChipText: '#4A5850',
  /** Ghost-garment stripes + the category word on them. */
  ghost: 'repeating-linear-gradient(135deg,#F7EBF2 0 5px,#FFFDFE 5px 10px)',
  ghostText: '#CE9CB8',
} as const;
