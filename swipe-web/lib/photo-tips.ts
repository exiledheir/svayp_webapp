import type { Locale } from '@/lib/translations';

/** Which flow the tips are for — adding a wardrobe item vs a market listing. */
export type PhotoTipsKind = 'item' | 'listing';

/** A single "perfect photo" tip: a heading, a short paragraph and optional
 *  example photo(s) (paths under /public). */
export interface PhotoTip {
  title: string;
  desc: string;
  images?: string[];
}

export interface PhotoTipsContent {
  title: string;
  done: string;
  closeLabel: string;
  tips: PhotoTip[];
}

// Example photos — reuse the existing clean, single-item product shots.
const TOP = '/images/closet/add_top_onboarding.webp';
const BOTTOM = '/images/closet/add_bottom_onboarding.webp';
const SHOES = '/images/closet/add_shoes_onboarding.webp';

// ── Adding a wardrobe item (AI needs a clean, single-garment shot) ───────────
const ITEM: Record<Locale, PhotoTipsContent> = {
  uz: {
    title: 'Mukammal rasm qanday olinadi?',
    done: 'Tushunarli',
    closeLabel: 'Yopish',
    tips: [
      { title: 'Toza, och fon', desc: 'Buyumni bir xil, och rangli fonda suratga oling — sun’iy intellekt uni aniqroq ajratib oladi.', images: [TOP] },
      { title: 'Buyum markazda', desc: 'Kiyimni kadr markaziga joylashtiring va atrofida biroz joy qoldiring.', images: [SHOES] },
      { title: 'To‘liq ko‘rinish', desc: 'Kiyimni yoyib yoki ilgakka ilib, butun shaklini ko‘rsating.', images: [BOTTOM] },
      { title: 'Yaxshi yorug‘lik', desc: 'Yorug‘ kunduzgi nurdan foydalaning; qattiq soya va xira yorug‘likdan saqlaning.' },
      { title: 'Bitta buyum, tekis', desc: 'Har bir suratda faqat bitta kiyim bo‘lsin va burmalarini tekislang.' },
    ],
  },
  ru: {
    title: 'Как сделать идеальное фото?',
    done: 'Понятно',
    closeLabel: 'Закрыть',
    tips: [
      { title: 'Чистый светлый фон', desc: 'Снимайте на однотонном светлом фоне — ИИ точнее вырежет вещь.', images: [TOP] },
      { title: 'Вещь по центру', desc: 'Поместите вещь в центр кадра и оставьте немного места вокруг.', images: [SHOES] },
      { title: 'Покажите вещь целиком', desc: 'Разложите или повесьте вещь, чтобы показать её форму полностью.', images: [BOTTOM] },
      { title: 'Хорошее освещение', desc: 'Используйте дневной свет и избегайте резких теней.' },
      { title: 'Одна вещь, без складок', desc: 'На каждом фото только одна вещь; расправьте складки.' },
    ],
  },
  en: {
    title: 'How to take the perfect photo?',
    done: 'Got it',
    closeLabel: 'Close',
    tips: [
      { title: 'Clean, light background', desc: 'Shoot on a plain, light background — the AI cuts the item out more accurately.', images: [TOP] },
      { title: 'Center the item', desc: 'Place the item in the middle of the frame with a little space around it.', images: [SHOES] },
      { title: 'Show the whole item', desc: 'Lay it flat or hang it to show the full shape.', images: [BOTTOM] },
      { title: 'Good lighting', desc: 'Use daylight and avoid harsh shadows.' },
      { title: 'One item, no wrinkles', desc: 'One garment per photo; smooth out the wrinkles.' },
    ],
  },
};

// ── Adding a market listing (attract buyers, build trust) ────────────────────
const LISTING: Record<Locale, PhotoTipsContent> = {
  uz: {
    title: 'Xaridorlarni jalb qiladigan rasm qanday olinadi?',
    done: 'Tushunarli',
    closeLabel: 'Yopish',
    tips: [
      { title: 'Yorug‘lik', desc: 'Kunduzgi yorug‘da suratga oling — mahsulot yorqinroq va jozibadorroq ko‘rinadi.', images: [TOP] },
      { title: 'Toza fon va markazda', desc: 'Mahsulotni bir xil, neytral fonda kadr markaziga joylashtiring. Atrofida yetarli joy qoldiring — foto toza va chiroyli ko‘rinadi.', images: [SHOES, BOTTOM] },
      { title: 'Turli rakurslar', desc: 'Old, orqa va muhim tafsilotlarni ko‘rsating.' },
      { title: 'Kamchiliklarni yashirmang', desc: 'Nuqson bo‘lsa, halol ko‘rsating — bu xaridor ishonchini oshiradi.' },
      { title: 'Haqiqiy suratlar', desc: 'Internetdan emas, o‘z suratlaringizdan foydalaning.' },
    ],
  },
  ru: {
    title: 'Как сделать фото, чтобы привлечь покупателей',
    done: 'Понятно',
    closeLabel: 'Закрыть',
    tips: [
      { title: 'Освещение', desc: 'Снимайте при дневном свете, чтобы товар выглядел ярче и привлекательнее.', images: [TOP] },
      { title: 'Чистый фон и объект по центру', desc: 'Разместите товар в центре кадра на простом, нейтральном фоне. Оставьте вокруг достаточно места, чтобы фото выглядело аккуратно и стильно.', images: [SHOES, BOTTOM] },
      { title: 'Разные ракурсы', desc: 'Покажите перёд, спину и важные детали.' },
      { title: 'Не скрывайте дефекты', desc: 'Честно показывайте недостатки — это повышает доверие покупателей.' },
      { title: 'Реальные фото', desc: 'Используйте свои фото, а не из интернета.' },
    ],
  },
  en: {
    title: 'How to take photos that attract buyers',
    done: 'Got it',
    closeLabel: 'Close',
    tips: [
      { title: 'Lighting', desc: 'Shoot in daylight so the item looks brighter and more appealing.', images: [TOP] },
      { title: 'Clean background, centered', desc: 'Place the item in the center of the frame on a plain, neutral background. Leave enough space around it so the photo looks tidy and stylish.', images: [SHOES, BOTTOM] },
      { title: 'Multiple angles', desc: 'Show the front, back and important details.' },
      { title: 'Don’t hide flaws', desc: 'Honestly show any defects — it builds buyer trust.' },
      { title: 'Real photos', desc: 'Use your own photos, not ones from the internet.' },
    ],
  },
};

export function getPhotoTips(kind: PhotoTipsKind, locale: Locale): PhotoTipsContent {
  const set = kind === 'listing' ? LISTING : ITEM;
  return set[locale] ?? set.uz;
}
