import React from 'react';
import { useI18n } from '@/lib/i18n';
import Diamond from '@/components/closet/Diamond';
import { useOverlayBackClose } from '@/lib/use-overlay-back-close';
import type { PromoApplied } from '@/lib/promo';

/**
 * Экран успеха после активации промокода (пункт 6.4 ТЗ).
 *
 * Отдельный шит, а не тост: бонус может быть заметной суммой, и человек должен увидеть,
 * что именно он получил, — начисленные алмазы или скидку на первую покупку.
 */
export default function PromoSuccessSheet({
  result,
  dark,
  onClose,
}: {
  result: PromoApplied;
  dark: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  useOverlayBackClose(true, onClose);

  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';
  const surface = dark ? '#1c1c1e' : '#fff';

  // Повторный ввод ничего не начисляет — писать «вам зачислено 50 алмазов» второй раз значит
  // врать. Показываем текущее состояние: скидка ещё жива или уже потрачена.
  const detail = result.alreadyActivated
    ? result.discountActive
      ? t.promo_already_active.replace('{n}', String(result.value))
      : t.promo_already_used_info
    : result.type === 'BONUS_COINS'
      ? t.promo_success_bonus.replace('{n}', String(result.value))
      : t.promo_success_discount.replace('{n}', String(result.value));

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col justify-end"
      style={{ background: 'rgba(15,8,14,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] mx-auto px-5 pt-4"
        style={{
          background: surface,
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mx-auto mb-5" style={{ background: dark ? '#3a3a3c' : '#e2dbe1' }} />

        <div className="flex flex-col items-center text-center">
          <Diamond size={52} glow />
          <h3 className="text-[19px] font-extrabold mt-3" style={{ color: ink }}>
            {result.alreadyActivated ? t.promo_already_title : t.promo_success_title}
          </h3>
          <p className="text-[15px] font-bold mt-1.5" style={{ color: '#E0559A' }}>
            {detail}
          </p>
          <p className="text-[13px] mt-1" style={{ color: sub }}>
            {result.code}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full h-14 rounded-2xl mt-6 text-white text-[16px] font-bold active:scale-[0.98] transition-transform"
          style={{ background: '#F370A7' }}
        >
          {t.promo_success_ok}
        </button>
      </div>
    </div>
  );
}
