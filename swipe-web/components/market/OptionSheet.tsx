import React from 'react';
import { Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface OptionItem {
  value: string;
  label: string;
  hex?: string; // for color swatches
}

interface SingleProps {
  open: boolean;
  title: string;
  options: OptionItem[];
  value: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  multi?: false;
}

interface MultiProps {
  open: boolean;
  title: string;
  options: OptionItem[];
  values: string[];
  onSelect: (values: string[]) => void;
  onClose: () => void;
  multi: true;
}

type Props = SingleProps | MultiProps;

/**
 * Generic bottom-sheet select list (Бренд / Размер / Цвет …).
 * Pass `multi={true}` + `values`/`onSelect(string[])` for multi-select.
 */
export default function OptionSheet(props: Props) {
  const { t } = useI18n();
  if (!props.open) return null;

  const isMulti = props.multi === true;

  function isActive(v: string) {
    if (isMulti) return (props as MultiProps).values.includes(v);
    return (props as SingleProps).value === v;
  }

  function handleClick(v: string) {
    if (isMulti) {
      const p = props as MultiProps;
      const next = p.values.includes(v)
        ? p.values.filter((x) => x !== v)
        : [...p.values, v];
      p.onSelect(next);
    } else {
      (props as SingleProps).onSelect(v);
      props.onClose();
    }
  }

  return (
    <div
      className="absolute inset-0 z-[70] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={props.onClose}
    >
      <div
        className="flex flex-col bg-white dark:bg-[#1c1c1e]"
        style={{ borderRadius: '24px 24px 0 0', maxHeight: '78vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="w-9 h-1 rounded-full mx-auto mb-3" style={{ background: 'rgba(128,128,128,0.4)' }} />
          <h2 className="text-[16px] font-bold text-center text-black dark:text-white">{props.title}</h2>
        </div>
        <div className="px-5 overflow-y-auto flex-1">
          {props.options.map((opt) => {
            const active = isActive(opt.value);
            return (
              <button
                key={opt.value}
                className="w-full flex items-center gap-3 py-3.5 border-b border-black/5 dark:border-white/10 text-left"
                onClick={() => handleClick(opt.value)}
              >
                {opt.hex && (
                  <span
                    className="w-6 h-6 rounded-full shrink-0 border border-black/10"
                    style={{ background: opt.hex }}
                  />
                )}
                <span className={`flex-1 text-[15px] ${active ? 'font-bold' : 'font-normal'} text-black dark:text-white`}>
                  {opt.label}
                </span>
                <span
                  className={`w-6 h-6 flex items-center justify-center shrink-0 ${isMulti ? 'rounded-md' : 'rounded-full'}`}
                  style={{
                    border: active ? 'none' : '1.5px solid rgba(128,128,128,0.4)',
                    background: active ? '#F370A7' : 'transparent',
                  }}
                >
                  {active && <Check size={14} strokeWidth={3} color="white" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="px-5 pt-3 pb-6 shrink-0" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
          <button
            onClick={props.onClose}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px] active:opacity-90"
            style={{ background: '#F370A7' }}
          >
            {t.mk_apply}
          </button>
        </div>
      </div>
    </div>
  );
}
