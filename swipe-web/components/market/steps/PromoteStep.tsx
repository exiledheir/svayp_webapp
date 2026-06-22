import React from 'react';
import { TrendingUp, Maximize2, Crown, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import StepScaffold from './StepScaffold';
import type { StepProps } from './types';

interface Promo {
  key: string;
  icon: typeof TrendingUp;
  title: string;
  price: string;
  perks: string[];
}

export default function PromoteStep({ form, patch, onNext }: StepProps) {
  const { t } = useI18n();
  const selected = form.promoOptions ?? [];

  const promos: Promo[] = [
    { key: 'maxi', icon: Maximize2, title: t.mk_promote_maxi, price: '7 400 сум · 7 дней', perks: ['Объявление выше в поиске', 'Крупная фотография', 'Бейдж «Premium»'] },
    { key: 'up', icon: TrendingUp, title: t.mk_promote_up, price: '3 600 сум · 4 раза', perks: ['Автоподнятие 4 раза', 'Поднимается вверх в ленте'] },
    { key: 'premium', icon: Crown, title: t.mk_promote_premium, price: '12 000 сум · 7 дней', perks: ['Максимум показов', 'Премиум-бейдж'] },
  ];

  function toggle(key: string) {
    patch({ promoOptions: selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key] });
  }

  return (
    <StepScaffold
      title={t.mk_promote_title}
      ctaLabel={t.mk_continue}
      ctaDisabled={false}
      onCta={onNext}
      secondaryLabel={t.mk_promote_skip}
      onSecondary={() => { patch({ promoOptions: [] }); onNext(); }}
    >
      <div className="flex flex-col gap-3">
        {promos.map((p) => {
          const Icon = p.icon;
          const on = selected.includes(p.key);
          return (
            <button
              key={p.key}
              onClick={() => toggle(p.key)}
              className="w-full text-left p-4 rounded-2xl"
              style={{ border: on ? '1.5px solid #F370A7' : '1px solid rgba(128,128,128,0.16)' }}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(243,112,167,0.12)' }}>
                  <Icon size={20} className="text-[#F370A7]" />
                </span>
                <span className="flex-1">
                  <span className="block text-[16px] font-bold text-black dark:text-white">{p.title}</span>
                  <span className="block text-[13px] font-semibold text-[#F370A7]">{p.price}</span>
                </span>
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ border: on ? 'none' : '1.5px solid rgba(128,128,128,0.4)', background: on ? '#F370A7' : 'transparent' }}
                >
                  {on && <Check size={14} strokeWidth={3} color="white" />}
                </span>
              </div>
              <ul className="mt-3 pl-1 space-y-1">
                {p.perks.map((perk) => (
                  <li key={perk} className="text-[13px] text-black/55 dark:text-white/55 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-current shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </StepScaffold>
  );
}
