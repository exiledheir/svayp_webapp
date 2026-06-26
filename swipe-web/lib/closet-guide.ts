import type { Locale } from '@/lib/translations';

/** A single step in the closet "how to use" guide. */
export interface GuideStep {
  /** Screenshot(s) for this step. Live in /public/images/closet/guide/. */
  images: string[];
  title: string;
  /** One or more short lines explaining the step. */
  bullets: string[];
}

/** Localized chrome strings for the guide (button, modal title, etc.). */
export interface GuideStrings {
  /** Header pill + modal title. */
  guide: string;
  /** Subtitle under the modal title. */
  subtitle: string;
  /** Video section heading. */
  videoTitle: string;
  /** Shown in the video card until a link is wired up. */
  videoSoon: string;
  /** "Step {n}" badge — {n} is replaced with the step number. */
  stepLabel: string;
  /** Closing CTA at the bottom of the guide. */
  done: string;
  /** Accessibility labels (screen readers / aria). */
  closeLabel: string;
  prevLabel: string;
  nextLabel: string;
}

const STRINGS: Record<Locale, GuideStrings> = {
  uz: {
    guide: "Qo'llanma",
    subtitle: "Libas'dan qanday foydalanishni bosqichma-bosqich o'rganing",
    videoTitle: 'Video qo‘llanma',
    videoSoon: 'Video tez orada qo‘shiladi',
    stepLabel: '{n}-QADAM',
    done: 'Tushunarli',
    closeLabel: 'Yopish',
    prevLabel: 'Oldingi',
    nextLabel: 'Keyingi',
  },
  ru: {
    guide: 'Руководство',
    subtitle: 'Пошагово узнайте, как пользоваться Libas',
    videoTitle: 'Видеоруководство',
    videoSoon: 'Видео появится в ближайшее время',
    stepLabel: 'ШАГ {n}',
    done: 'Понятно',
    closeLabel: 'Закрыть',
    prevLabel: 'Назад',
    nextLabel: 'Далее',
  },
  en: {
    guide: 'Guide',
    subtitle: 'Learn how to use Libas, step by step',
    videoTitle: 'Video guide',
    videoSoon: 'Video coming soon',
    stepLabel: 'STEP {n}',
    done: 'Got it',
    closeLabel: 'Close',
    prevLabel: 'Previous',
    nextLabel: 'Next',
  },
};

function shot(name: string): string {
  return `/images/closet/guide/${name}.png`;
}

/** Screenshot list for a step. Step 4 (Boards) ships two screenshots. */
function img(n: number): string[] {
  if (n === 4) return [shot('qadam-4-1'), shot('qadam-4-2')];
  return [shot(`qadam-${n}`)];
}

const STEPS: Record<Locale, GuideStep[]> = {
  uz: [
    { images: img(1), title: 'Kiyimlarni yuklash', bullets: [
      '"+" tugmasini bosing',
      'Kiyimlaringiz rasmini tanlang va qo‘shing',
      'Tasdiqlash tugmasini bosing',
    ] },
    { images: img(2), title: 'Kategoriyani tanlang', bullets: [
      'Kiyim uchun mos kategoriyani tanlang va qo‘shimcha ma’lumotlarni kiriting.',
      'Bu sun’iy intellektga siz uchun yanada aniq obrazlar yaratishga yordam beradi.',
    ] },
    { images: img(3), title: 'Sun’iy intellekt kiyimlarni tayyorlaydi', bullets: [
      'Bir necha daqiqadan so‘ng Libas AI kiyimlaringizni qayta ishlab, garderobingizni shakllantiradi.',
    ] },
    { images: img(4), title: 'Doskalar', bullets: [
      'Doskalar bo‘limida o‘zingizning obrazlaringizni yaratishingiz mumkin.',
      'Sun’iy intellekt yordamida yangi obrazlar generatsiya qiling.',
      'Yoki kiyimlarni qo‘lda tanlab, o‘zingizga mos kombinatsiyalar yarating.',
    ] },
    { images: img(5), title: 'Virtual kiyib ko‘ring', bullets: [
      '"Kiyib ko‘ring" tugmasini bosing.',
      'Maneken ustida kiyimlar qanday turishini ko‘ring.',
    ] },
    { images: img(6), title: 'Kiyintirish', bullets: [
      '"Kiyintirish" funksiyasi orqali yuklangan kiyimlaringiz qanday turishini juda tez ko‘rishingiz mumkin.',
    ] },
    { images: img(7), title: 'Haftalik obrazlar', bullets: [
      'Kalendar bo‘limida sun’iy intellekt siz uchun haftalik obrazlar yaratadi.',
      'Har kuni nima kiyishni oldindan rejalashtiring.',
    ] },
    { images: img(8), title: 'Obrazlar', bullets: [
      'Bu yerda sun’iy intellekt yaratgan barcha obrazlar saqlanadi.',
      'Istalgan vaqtda avvalgi kombinatsiyalarni ko‘rib chiqishingiz mumkin.',
    ] },
  ],
  ru: [
    { images: img(1), title: 'Загрузка одежды', bullets: [
      'Нажмите кнопку "+"',
      'Выберите и добавьте фото вашей одежды',
      'Нажмите кнопку подтверждения',
    ] },
    { images: img(2), title: 'Выберите категорию', bullets: [
      'Выберите подходящую категорию для вещи и укажите дополнительные детали.',
      'Это поможет искусственному интеллекту создавать для вас более точные образы.',
    ] },
    { images: img(3), title: 'Искусственный интеллект обрабатывает одежду', bullets: [
      'Через несколько минут Libas AI обработает вашу одежду и сформирует ваш гардероб.',
    ] },
    { images: img(4), title: 'Доски', bullets: [
      'В разделе "Доски" вы можете создавать свои образы.',
      'Генерируйте новые образы с помощью искусственного интеллекта.',
      'Или выбирайте вещи вручную и создавайте подходящие вам комбинации.',
    ] },
    { images: img(5), title: 'Виртуальная примерка', bullets: [
      'Нажмите кнопку "Примерить".',
      'Посмотрите, как одежда смотрится на манекене.',
    ] },
    { images: img(6), title: 'Одевание', bullets: [
      'Функция "Одевание" позволяет очень быстро увидеть, как смотрится загруженная одежда.',
    ] },
    { images: img(7), title: 'Образы на неделю', bullets: [
      'В разделе "Календарь" искусственный интеллект создаёт для вас образы на неделю.',
      'Планируйте заранее, что надеть каждый день.',
    ] },
    { images: img(8), title: 'Образы', bullets: [
      'Здесь хранятся все образы, созданные искусственным интеллектом.',
      'В любой момент вы можете просмотреть предыдущие комбинации.',
    ] },
  ],
  en: [
    { images: img(1), title: 'Upload your clothes', bullets: [
      'Tap the "+" button',
      'Pick and add a photo of your clothing',
      'Tap the confirm button',
    ] },
    { images: img(2), title: 'Choose a category', bullets: [
      'Pick the right category for the item and add extra details.',
      'This helps the AI create more accurate looks for you.',
    ] },
    { images: img(3), title: 'The AI prepares your clothes', bullets: [
      'In a few minutes Libas AI processes your clothes and builds your wardrobe.',
    ] },
    { images: img(4), title: 'Boards', bullets: [
      'In the Boards section you can create your own looks.',
      'Generate new looks with AI.',
      'Or pick items manually and build combinations that suit you.',
    ] },
    { images: img(5), title: 'Virtual try-on', bullets: [
      'Tap the "Try on" button.',
      'See how the clothes look on the mannequin.',
    ] },
    { images: img(6), title: 'Styling', bullets: [
      'The "Styling" feature lets you very quickly see how your uploaded clothes look.',
    ] },
    { images: img(7), title: 'Weekly looks', bullets: [
      'In the Calendar section the AI creates weekly outfits for you.',
      'Plan ahead what to wear each day.',
    ] },
    { images: img(8), title: 'Looks', bullets: [
      'All looks created by the AI are stored here.',
      'You can review previous combinations anytime.',
    ] },
  ],
};

/**
 * YouTube video URL for the guide. Paste the share/watch link or an embed URL —
 * `getYouTubeEmbedUrl` normalizes it. Leave empty to show the "coming soon" card.
 */
export const GUIDE_VIDEO_URL = 'https://www.youtube.com/shorts/KoviqEhfaVY';

/** Normalize a YouTube watch/share/embed/shorts link to an embeddable URL. */
export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

export function getGuideStrings(locale: Locale): GuideStrings {
  return STRINGS[locale] ?? STRINGS.uz;
}

export function getGuideSteps(locale: Locale): GuideStep[] {
  return STEPS[locale] ?? STEPS.uz;
}
