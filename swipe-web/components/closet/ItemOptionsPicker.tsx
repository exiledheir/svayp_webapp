import React, { useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  WARDROBE_TAXONOMY,
  getSection,
  getSubcategoryDef,
  FIT_TYPES,
  taxLabel,
} from '@/lib/wardrobe-taxonomy';
import type {
  WardrobeSection,
  WardrobeSubcategory,
  WardrobeItemType,
  WardrobeLength,
  WardrobeFitType,
} from '@/types';

export interface ItemOptionsSelection {
  section: WardrobeSection;
  subcategory: WardrobeSubcategory | null;
  itemType: WardrobeItemType | null;
  length: WardrobeLength | null;
  fitType: WardrobeFitType | null;
}

/** A fresh selection for a section — nothing downstream chosen yet. */
export function defaultSelectionForSection(section: WardrobeSection): ItemOptionsSelection {
  return { section, subcategory: null, itemType: null, length: null, fitType: null };
}

/** Whether every applicable field has been chosen (all fields are required). */
export function isSelectionComplete(sel: ItemOptionsSelection): boolean {
  if (!sel.subcategory) return false;
  const def = getSubcategoryDef(sel.subcategory);
  if (!def) return true;
  if (def.itemTypes && def.itemTypes.length > 0 && !sel.itemType) return false;
  if (def.lengths && def.lengths.length > 0 && !sel.length) return false;
  if (def.hasFit && !sel.fitType) return false;
  return true;
}

interface ItemOptionsPickerProps {
  value: ItemOptionsSelection;
  onChange: (next: ItemOptionsSelection) => void;
  /** Constrain the visible sections (e.g. onboarding only shows TOPS/DRESSES_SETS/OUTERWEAR). */
  allowedSections?: WardrobeSection[];
  /** Hide the section row entirely (when the section is fixed by context). */
  hideSection?: boolean;
  dark?: boolean;
  /** Active-chip background. Defaults to brand pink. */
  accent?: string;
}

export default function ItemOptionsPicker({
  value,
  onChange,
  allowedSections,
  hideSection,
  dark = false,
  accent = '#F370A7',
}: ItemOptionsPickerProps) {
  const { t, locale } = useI18n();

  const sections = WARDROBE_TAXONOMY
    .filter((s) => !allowedSections || allowedSections.includes(s.value))
    .map((s) => s.value);

  const sectionDef = getSection(value.section);
  const subDef = value.subcategory ? getSubcategoryDef(value.subcategory) : undefined;

  const idleBg = dark ? '#2a2a2a' : 'rgba(0,0,0,0.05)';
  const idleColor = dark ? '#cfcfcf' : '#555';
  const labelColor = dark ? '#777' : '#9ca3af';

  function chip(active: boolean, label: string, onClick: () => void, key: string) {
    return (
      <button
        key={key}
        type="button"
        onClick={onClick}
        className="px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors"
        style={{ background: active ? accent : idleBg, color: active ? '#fff' : idleColor }}
      >
        {label}
      </button>
    );
  }

  // The next field the user still has to fill in — used to auto-scroll it into
  // view so it's obvious what's missing (and why the Save button is disabled).
  const targetStep: string | null =
    !value.subcategory ? 'type'
    : (subDef?.itemTypes && subDef.itemTypes.length > 0 && !value.itemType) ? 'subtype'
    : (subDef?.lengths && subDef.lengths.length > 0 && !value.length) ? 'length'
    : (subDef?.hasFit && !value.fitType) ? 'fit'
    : null;

  const targetRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const firstRun = useRef(true);
  useEffect(() => {
    // Don't jump on first mount; only after a selection reveals the next field.
    if (firstRun.current) { firstRun.current = false; return; }
    const el = targetStep ? targetRef.current : endRef.current;
    el?.scrollIntoView({ behavior: 'smooth', block: targetStep ? 'center' : 'end' });
  }, [targetStep]);

  function row(stepKey: string, label: string, chips: React.ReactNode) {
    return (
      <div ref={stepKey === targetStep ? targetRef : undefined}>
        <p className="text-[12px] font-semibold mb-2" style={{ color: labelColor }}>{label}</p>
        <div className="flex flex-wrap gap-2">{chips}</div>
      </div>
    );
  }

  function selectSection(section: WardrobeSection) {
    if (section === value.section) return;
    onChange(defaultSelectionForSection(section));
  }

  function selectSubcategory(sub: WardrobeSubcategory) {
    // Changing the type resets the dependent fields below it.
    onChange({ section: value.section, subcategory: sub, itemType: null, length: null, fitType: null });
  }

  function selectItemType(it: WardrobeItemType) {
    onChange({ ...value, itemType: it });
  }
  function selectLength(l: WardrobeLength) {
    onChange({ ...value, length: l });
  }
  function selectFit(f: WardrobeFitType) {
    onChange({ ...value, fitType: f });
  }

  // Progressive reveal: a step appears only once everything above it is answered.
  const typeChosen = !!value.subcategory;
  const itemTypeSatisfied = !subDef?.itemTypes || !!value.itemType;
  const lengthSatisfied = !subDef?.lengths || !!value.length;

  return (
    <div className="flex flex-col gap-3.5">
      {/* Section */}
      {!hideSection && sections.length > 1 &&
        row('section', t.optSection, sections.map((s) => chip(value.section === s, taxLabel(s, locale), () => selectSection(s), s)))}

      {/* Type (subcategory) */}
      {sectionDef &&
        row('type', t.optType, sectionDef.subcategories.map((sub) =>
          chip(value.subcategory === sub.value, taxLabel(sub.value, locale), () => selectSubcategory(sub.value), sub.value),
        ))}

      {/* Subtype (itemType) */}
      {typeChosen && subDef?.itemTypes && subDef.itemTypes.length > 0 &&
        row('subtype', t.optSubtype, subDef.itemTypes.map((it) =>
          chip(value.itemType === it, taxLabel(it, locale), () => selectItemType(it), it),
        ))}

      {/* Length / cut */}
      {typeChosen && subDef?.lengths && subDef.lengths.length > 0 &&
        row('length', t.optLength, subDef.lengths.map((l) =>
          chip(value.length === l, taxLabel(l, locale), () => selectLength(l), l),
        ))}

      {/* Fit — only after the subtype/length above it is chosen */}
      {typeChosen && subDef?.hasFit && itemTypeSatisfied && lengthSatisfied &&
        row('fit', t.optFit, FIT_TYPES.map((f) => chip(value.fitType === f, taxLabel(f, locale), () => selectFit(f), f)))}

      {/* Scroll anchor — brought into view once everything is chosen so the
          (now-enabled) Save button below is visible. */}
      <div ref={endRef} aria-hidden className="h-px w-px" />
    </div>
  );
}
