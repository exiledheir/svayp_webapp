/**
 * Nur's colours — the app's own tokens, not a palette of its own.
 *
 * The stylist screens used to run a warm cream-and-gold scheme (#FAFAF8 ground,
 * #C8A882 accent) that read as a different product the moment you arrived from
 * the Closet, Feed or Market. These are the same surfaces those pages use:
 * white / #111111 grounds, the 5%-black fill behind their round buttons and
 * search field, and pink as the one accent. Shared by the chat, the profile and
 * the first-run onboarding so all three stay in step.
 */
export interface StylistTheme {
  /** Page ground. */
  bg: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  muted: string;
  /** Filled surface: bubbles, chips, the composer field, round buttons. */
  card: string;
  /** Hairline separators. */
  line: string;
  /** The single accent — primary actions (send) and highlights. */
  accent: string;
  /** Accent-tinted surface for chips and badges (BETA, Coming soon). */
  accentWash: string;
  /** Text/icon colour that stays legible on [accentWash]. */
  accentInk: string;
  /** Gradient used for the app's AI moments, e.g. the coming-soon mark. */
  accentGradient: string;
}

export function stylistTheme(dark: boolean): StylistTheme {
  return {
    bg: dark ? '#111111' : '#FFFFFF',
    ink: dark ? '#F0F0F0' : '#000000',
    muted: dark ? '#9CA3AF' : '#6B7280',
    card: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    line: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    accent: '#F370A7',
    accentWash: dark ? 'rgba(243,112,167,0.16)' : '#FDEEF6',
    accentInk: dark ? '#F9B7D5' : '#B03A72',
    accentGradient: 'linear-gradient(135deg,#F9A9CB,#F370A7)',
  };
}
