import type { ClosetItem, ClosetCategory } from '@/lib/closet-storage';
import { UPPER_CATS, FULL_BODY_CATS, LOWER_CATS, SHOES_CATS } from '@/lib/closet-types';
import { getUser } from '@/lib/auth';

/**
 * First-run closet setup (`/closet/setup`).
 *
 * A brand-new account lands on a blocking two-slot screen whose only job is
 * getting two garments in, because session recordings showed users swiping the
 * old empty-closet page instead of adding anything. This module holds the rules
 * shared by that screen and the closet tab's redirect guard.
 */

/** Which pair of garments the user is filling. */
export type SetupMode = 'pair' | 'dress';

/** A single slot on the setup screen. */
export type SlotKey = 'top' | 'bottom' | 'dress' | 'shoes';

/** The two slots of each mode, in display order. */
export function slotsForMode(mode: SetupMode): [SlotKey, SlotKey] {
  return mode === 'dress' ? ['dress', 'shoes'] : ['top', 'bottom'];
}

/** The mode a slot belongs to. */
export function modeForSlot(slot: SlotKey): SetupMode {
  return slot === 'dress' || slot === 'shoes' ? 'dress' : 'pair';
}

/**
 * Which slot an added garment fills, or null when it fills none (a bag, a
 * scarf, …). Mirrors the closet's own outfit rules: a jacket counts as a top,
 * a dress/jumpsuit is a full-body item and never a top.
 */
export function slotForCategory(category: ClosetCategory): SlotKey | null {
  if (FULL_BODY_CATS.includes(category)) return 'dress';
  if (UPPER_CATS.includes(category)) return 'top';
  if (LOWER_CATS.includes(category)) return 'bottom';
  if (SHOES_CATS.includes(category)) return 'shoes';
  return null;
}

/** The first closet item that fills `slot`, or null. */
export function findSlotItem(items: ClosetItem[], slot: SlotKey): ClosetItem | null {
  return items.find((i) => slotForCategory(i.category) === slot) ?? null;
}

/**
 * Setup is satisfied once the closet can form an outfit: a top + a bottom, or a
 * dress/set + shoes. Same rule the closet uses to unlock styling.
 */
export function isSetupSatisfied(items: ClosetItem[]): boolean {
  const has = (slot: SlotKey) => items.some((i) => slotForCategory(i.category) === slot);
  return (has('top') && has('bottom')) || (has('dress') && has('shoes'));
}

/**
 * Which mode to resume in, given whatever is already in the closet. Prefers the
 * path the user has made the most progress on; ties go to top + bottom.
 */
export function detectMode(items: ClosetItem[]): SetupMode {
  const count = (mode: SetupMode) => slotsForMode(mode).filter((s) => findSlotItem(items, s)).length;
  return count('dress') > count('pair') ? 'dress' : 'pair';
}

// ── Persisted flags ───────────────────────────────────────────────────────────
// User-scoped so a second account on a shared/test device gets its own setup
// run. Inside the Flutter WebView the profile arrives a moment after the tokens,
// so a flag can be written before the user id is known — those land on a device
// key and are migrated to the user key on the first read that has an id.

const DONE_PREFIX = 'libas_closet_setup_done';
const ENTERED_PREFIX = 'libas_closet_setup_entered';

function currentUid(): string | null {
  const u = getUser();
  const uid = (u?.id ?? u?.userId ?? u?.user_id) as string | number | undefined;
  return uid == null ? null : String(uid);
}

function readFlag(prefix: string): boolean {
  if (typeof window === 'undefined') return false;
  const uid = currentUid();
  try {
    if (!uid) return localStorage.getItem(`${prefix}:device`) === '1';
    if (localStorage.getItem(`${prefix}:${uid}`) === '1') return true;
    // Written before the profile loaded — claim it for this user so a later
    // account on the same device starts clean.
    if (localStorage.getItem(`${prefix}:device`) !== '1') return false;
    localStorage.setItem(`${prefix}:${uid}`, '1');
    localStorage.removeItem(`${prefix}:device`);
    return true;
  } catch { return false; }
}

function writeFlag(prefix: string, on: boolean): void {
  if (typeof window === 'undefined') return;
  const key = `${prefix}:${currentUid() ?? 'device'}`;
  try {
    if (on) localStorage.setItem(key, '1');
    else { localStorage.removeItem(key); localStorage.removeItem(`${prefix}:device`); }
  } catch { /* private mode */ }
}

/** True once this user has finished setup — they are never forced back into it. */
export function isSetupDone(): boolean {
  return readFlag(DONE_PREFIX);
}

export function markSetupDone(): void {
  writeFlag(DONE_PREFIX, true);
  writeFlag(ENTERED_PREFIX, false);
}

/**
 * True while a setup run is in progress. Lets the closet tab send a user who
 * killed the app after their FIRST item back into setup, without dragging in
 * legacy accounts that happen to own a single item and never saw the screen.
 */
export function wasSetupEntered(): boolean {
  return readFlag(ENTERED_PREFIX);
}

export function markSetupEntered(): void {
  writeFlag(ENTERED_PREFIX, true);
}

export function clearSetupEntered(): void {
  writeFlag(ENTERED_PREFIX, false);
}
