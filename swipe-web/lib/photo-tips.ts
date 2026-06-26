import type { Locale } from '@/lib/translations';

/** Which flow the tips are for — adding a wardrobe item vs a market listing. */
export type PhotoTipsKind = 'item' | 'listing';

/** A single "perfect photo" tip: an icon key (mapped to a lucide icon in the
 *  sheet), a short title and a one-line explanation. */
export interface PhotoTip {
  icon: 'square' | 'shirt' | 'frame' | 'sun' | 'maximize' | 'sparkles' | 'images' | 'eye' | 'tag' | 'camera';
  title: string;
  desc: string;
}

export interface PhotoTipsContent {
  title: string;
  subtitle: string;
  done: string;
  closeLabel: string;
  tips: PhotoTip[];
}

// ── Adding a wardrobe item (AI needs a clean, single-garment shot) ───────────
const ITEM: Record<Locale, PhotoTipsContent> = {
  uz: {
    title: 'Mukammal rasmni qanday olish mumkin?',
    subtitle: 'Eng yaxshi natija uchun ushbu maslahatlarga amal qiling.',
    done: 'Tushunarli',
    closeLabel: 'Yopish',
    tips: [
      { icon: 'square', title: 'Toza fon', desc: 'Bir xil, och rangli fonda suratga oling.' },
      { icon: 'shirt', title: 'Bitta buyum', desc: 'Har bir suratda faqat bitta kiyim bo‘lsin.' },
      { icon: 'frame', title: 'To‘liq ko‘rinish', desc: 'Kiyimni yoyib yoki ilgakka ilib, to‘liq ko‘rsating.' },
      { icon: 'sun', title: 'Yaxshi yorug‘lik', desc: 'Yorug‘ kunduzgi nurdan foydalaning, soyalardan saqlaning.' },
      { icon: 'maximize', title: 'Kadrni to‘ldiring', desc: 'Kiyim kadrning katta qismini egallasin.' },
      { icon: 'sparkles', title: 'Tekis kiyim', desc: 'Burmalarni tekislang — natija toza chiqadi.' },
    ],
  },
  ru: {
    title: 'Как сделать идеальное фото?',
    subtitle: 'Следуйте этим советам для лучшего результата.',
    done: 'Понятно',
    closeLabel: 'Закрыть',
    tips: [
      { icon: 'square', title: 'Чистый фон', desc: 'Снимайте на однотонном светлом фоне.' },
      { icon: 'shirt', title: 'Одна вещь', desc: 'На каждом фото только одна вещь.' },
      { icon: 'frame', title: 'Полный вид', desc: 'Разложите или повесьте вещь, чтобы показать её целиком.' },
      { icon: 'sun', title: 'Хорошее освещение', desc: 'Используйте дневной свет, избегайте резких теней.' },
      { icon: 'maximize', title: 'Заполните кадр', desc: 'Вещь должна занимать большую часть фото.' },
      { icon: 'sparkles', title: 'Без складок', desc: 'Расправьте складки — вырез получится чище.' },
    ],
  },
  en: {
    title: 'How to take the perfect photo?',
    subtitle: 'Follow these tips for the best result.',
    done: 'Got it',
    closeLabel: 'Close',
    tips: [
      { icon: 'square', title: 'Plain background', desc: 'Shoot on a plain, light background.' },
      { icon: 'shirt', title: 'One item', desc: 'Only one garment per photo.' },
      { icon: 'frame', title: 'Full view', desc: 'Lay it flat or hang it to show the whole shape.' },
      { icon: 'sun', title: 'Good lighting', desc: 'Use bright daylight and avoid harsh shadows.' },
      { icon: 'maximize', title: 'Fill the frame', desc: 'Let the item fill most of the photo.' },
      { icon: 'sparkles', title: 'No wrinkles', desc: 'Smooth out wrinkles for a cleaner cut-out.' },
    ],
  },
};

// ── Adding a market listing (build buyer trust, sell faster) ─────────────────
const LISTING: Record<Locale, PhotoTipsContent> = {
  uz: {
    title: 'Mukammal rasmni qanday olish mumkin?',
    subtitle: 'Tezroq sotish uchun sifatli suratlar joylang.',
    done: 'Tushunarli',
    closeLabel: 'Yopish',
    tips: [
      { icon: 'sun', title: 'Tabiiy yorug‘lik', desc: 'Deraza yonida, kunduzgi yorug‘da suratga oling.' },
      { icon: 'images', title: 'Turli rakurslar', desc: 'Oldi, orqa va tafsilotlarni ko‘rsating.' },
      { icon: 'eye', title: 'Kamchiliklarni ko‘rsating', desc: 'Nuqson bo‘lsa, halol ko‘rsating — ishonch ortadi.' },
      { icon: 'square', title: 'Toza fon', desc: 'Ortiqcha narsasiz, tartibli fon tanlang.' },
      { icon: 'tag', title: 'Yorliqlar', desc: 'Brend va o‘lcham yorlig‘ini yaqindan suratga oling.' },
      { icon: 'camera', title: 'Haqiqiy suratlar', desc: 'Internetdan emas, o‘z suratlaringizdan foydalaning.' },
    ],
  },
  ru: {
    title: 'Как сделать идеальное фото?',
    subtitle: 'Качественные фото помогают продать быстрее.',
    done: 'Понятно',
    closeLabel: 'Закрыть',
    tips: [
      { icon: 'sun', title: 'Естественный свет', desc: 'Снимайте у окна при дневном свете.' },
      { icon: 'images', title: 'Разные ракурсы', desc: 'Покажите перёд, спину и детали.' },
      { icon: 'eye', title: 'Покажите дефекты', desc: 'Честно показывайте недостатки — это вызывает доверие.' },
      { icon: 'square', title: 'Чистый фон', desc: 'Используйте опрятный фон без лишних предметов.' },
      { icon: 'tag', title: 'Бирки', desc: 'Сфотографируйте бирку с брендом и размером.' },
      { icon: 'camera', title: 'Реальные фото', desc: 'Используйте свои фото, а не из интернета.' },
    ],
  },
  en: {
    title: 'How to take the perfect photo?',
    subtitle: 'Great photos help your item sell faster.',
    done: 'Got it',
    closeLabel: 'Close',
    tips: [
      { icon: 'sun', title: 'Natural light', desc: 'Shoot near a window in daylight.' },
      { icon: 'images', title: 'Multiple angles', desc: 'Show the front, back and details.' },
      { icon: 'eye', title: 'Show flaws', desc: 'Honestly show any defects to build trust.' },
      { icon: 'square', title: 'Clean background', desc: 'Use a tidy, uncluttered background.' },
      { icon: 'tag', title: 'Show labels', desc: 'Add a close-up of the brand/size label.' },
      { icon: 'camera', title: 'Real photos', desc: 'Use your own photos, not ones from the internet.' },
    ],
  },
};

export function getPhotoTips(kind: PhotoTipsKind, locale: Locale): PhotoTipsContent {
  const set = kind === 'listing' ? LISTING : ITEM;
  return set[locale] ?? set.uz;
}
