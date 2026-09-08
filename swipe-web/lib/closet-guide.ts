import type { Locale } from '@/lib/translations';

/**
 * Which built-in illustration a step shows — see components/closet/GuideIllustrations.tsx.
 *
 * The guide used to ship app screenshots. They went stale with every redesign (the last
 * set still showed the retired «Kiyintirish» tab) and at phone size the text in them was
 * unreadable. The illustrations are drawn from the same labels and components as the live
 * UI, so they follow the locale and theme and can't show a previous version of the app.
 */
export type GuideIllustration =
  | 'add'
  | 'beautify'
  | 'closet'
  | 'boards'
  | 'tryon'
  | 'looks'
  | 'feed'
  | 'diamonds';

/** A single step in the closet "how to use" guide. */
export interface GuideStep {
  illustration: GuideIllustration;
  /** Where in the app this happens — short kicker shown next to the step number. */
  eyebrow: string;
  title: string;
  /** Short lines explaining the step. Three at most: the guide is skimmed, not read. */
  bullets: string[];
}

/** Localized chrome strings for the guide (button, modal title, etc.). */
export interface GuideStrings {
  /** Header pill + modal title. */
  guide: string;
  /** Subtitle under the modal title. */
  subtitle: string;
  /** Title of the video player (iframe title / aria). */
  videoTitle: string;
  /** Header pill that opens the video. */
  video: string;
  /** "Step {n}" badge — {n} is replaced with the step number. */
  stepLabel: string;
  /** "{n} / {total}" counter in the header. */
  stepCounter: string;
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
    videoTitle: "Video qo'llanma",
    video: 'Video',
    stepLabel: '{n}-QADAM',
    stepCounter: '{n} / {total}',
    done: 'Tushunarli',
    closeLabel: 'Yopish',
    prevLabel: 'Oldingi',
    nextLabel: 'Keyingi',
  },
  ru: {
    guide: 'Руководство',
    subtitle: 'Пошагово узнайте, как пользоваться Libas',
    videoTitle: 'Видеоруководство',
    video: 'Видео',
    stepLabel: 'ШАГ {n}',
    stepCounter: '{n} / {total}',
    done: 'Понятно',
    closeLabel: 'Закрыть',
    prevLabel: 'Назад',
    nextLabel: 'Далее',
  },
  en: {
    guide: 'Guide',
    subtitle: 'Learn how to use Libas, step by step',
    videoTitle: 'Video guide',
    video: 'Video',
    stepLabel: 'STEP {n}',
    stepCounter: '{n} / {total}',
    done: 'Got it',
    closeLabel: 'Close',
    prevLabel: 'Previous',
    nextLabel: 'Next',
  },
};

/**
 * The steps follow the order a new person meets the app: add clothes → clean the photos →
 * browse the closet → outfits on boards → try-on → outfits & calendar → feed → paying for
 * AI actions. Button names in the text match the UI labels in lib/translations.ts — when a
 * label there changes, change it here too, or the guide sends people looking for a button
 * that no longer exists.
 */
const STEPS: Record<Locale, GuideStep[]> = {
  uz: [
    {
      illustration: 'add',
      eyebrow: 'Garderob',
      title: "Kiyimlaringizni qo'shing",
      bullets: [
        "«Qo'shish»ni bosing va Galereya yoki Kamerani tanlang — bir vaqtda bir nechta rasm bo'lsa ham bo'ladi.",
        "Istalgan rasm to'g'ri keladi: AI fonni olib tashlaydi va har bir kiyimni o'z kategoriyasiga joylaydi.",
        "Rasm yo'qmi? LIBAS do'konidan kiyimlarni bir bosishda qo'shing.",
      ],
    },
    {
      illustration: 'beautify',
      eyebrow: 'Beautify',
      title: "Rasmlar do'kondagidek",
      bullets: [
        "Har bir yangi kiyimning kategoriyasini tekshiring, AI adashgan bo'lsa — to'g'rilang.",
        "Beautify rasmni tozalaydi: fonni olib, studiya sifatiga keltiradi. «Oldin» va «keyin»ni solishtirib, yoqqanini qoldiring.",
        'Har bir rasm uchun bir necha olmos turadi.',
      ],
    },
    {
      illustration: 'closet',
      eyebrow: 'Garderob',
      title: "Hammasi o'z joyida",
      bullets: [
        "Kiyimlar kategoriya bo'yicha guruhlangan: chiplar orqali filtrlang yoki sana bo'yicha saralang.",
        "Kiyimni bosing — rang, mavsum, material va «Kiyib ko'rish» tugmasi chiqadi.",
        '«Belgilash» — aslida nima kiyganingizni eslab qolish uchun.',
      ],
    },
    {
      illustration: 'boards',
      eyebrow: 'Doskalar',
      title: 'AI yaratgan obrazlar',
      bullets: [
        "✦ «Kombinatsiya yaratish»ni bosing — AI kiyimlaringizdan obraz yig'adi. ↻ — yana bir variant.",
        "«O'zgartirish» muharrirni ochadi: surib joylashtiring, ikki barmoq bilan kattalashtiring, garderob yoki do'kondan kiyim almashtiring.",
        'Keyinroq qaytish uchun doskani saqlang.',
      ],
    },
    {
      illustration: 'tryon',
      eyebrow: "Kiyib ko'rish",
      title: "O'zingizda ko'ring",
      bullets: [
        "Istalgan doskada «Kiyib ko'ring»ni bosing.",
        "Manekenni tanlang yoki yaxshi yorug'likda to'liq bo'yli suratingizni yuklang.",
        "Natija 30–60 soniyada tayyor bo'ladi va «Obrazlar»ga saqlanadi.",
      ],
    },
    {
      illustration: 'looks',
      eyebrow: 'Obrazlar · Kalendar',
      title: 'Kunma-kun obrazlaringiz',
      bullets: [
        "«Obrazlar» bo'limida barcha kiyib ko'rish natijalari saqlanadi.",
        '«Kalendar» haftaning har kuniga obraz taklif qiladi — «Boshqa obraz» bilan almashtiring.',
      ],
    },
    {
      illustration: 'feed',
      eyebrow: 'Lenta',
      title: 'Uslubingizni ulashing',
      bullets: [
        "«Obrazlar» bo'limidan «Lentaga joylash» tugmasi bilan obrazni lentaga chiqaring.",
        "Boshqalarga obuna bo'ling, obrazlariga layk bosing va izoh qoldiring.",
        "Kiyib ko'rilgan postlar ko'proq e'tibor oladi.",
      ],
    },
    {
      illustration: 'diamonds',
      eyebrow: 'Olmoslar · Premium',
      title: "AI amallari qanday to'lanadi",
      bullets: [
        "Olmoslar kiyib ko'rish, Beautify va obraz yaratishga sarflanadi — narx har bir tugmada ko'rinadi.",
        "Balansni to'ldirish — yuqoridagi olmos tugmasi orqali.",
        "Premium bir martalik to'ldirish o'rniga oylik limit beradi — «Premium» bo'limi.",
      ],
    },
  ],
  ru: [
    {
      illustration: 'add',
      eyebrow: 'Гардероб',
      title: 'Добавьте свою одежду',
      bullets: [
        'Нажмите «Добавить» и выберите «Галерея» или «Камера» — можно сразу несколько фото.',
        'Подойдёт любое фото: ИИ уберёт фон и разложит вещи по категориям.',
        'Нет фото? Добавьте вещи из магазина LIBAS в одно касание.',
      ],
    },
    {
      illustration: 'beautify',
      eyebrow: 'Beautify',
      title: 'Фото как в магазине',
      bullets: [
        'Проверьте категорию каждой новой вещи и поправьте, если ИИ ошибся.',
        'Beautify очищает фото: убирает фон и делает студийный кадр. Сравните «до» и «после» и оставьте то, что нравится.',
        'Стоит несколько алмазов за фото.',
      ],
    },
    {
      illustration: 'closet',
      eyebrow: 'Гардероб',
      title: 'Всё по полочкам',
      bullets: [
        'Вещи сгруппированы по категориям: фильтруйте по чипам или сортируйте по дате.',
        'Нажмите на вещь — увидите цвет, сезон, материал и кнопку «Примерить».',
        '«Отметить» — чтобы помнить, что вы носите на самом деле.',
      ],
    },
    {
      illustration: 'boards',
      eyebrow: 'Доски',
      title: 'Образы от ИИ',
      bullets: [
        'Нажмите ✦ «Генерировать образ» — ИИ соберёт вещи в образ. ↻ — ещё вариант.',
        '«Изменить» откроет редактор: тяните, чтобы двигать, сводите пальцы, чтобы менять размер, меняйте вещи из гардероба или магазина.',
        'Сохраните доску, чтобы вернуться к ней позже.',
      ],
    },
    {
      illustration: 'tryon',
      eyebrow: 'Примерка',
      title: 'Посмотрите на себе',
      bullets: [
        'Нажмите «Примерить» на любой доске.',
        'Выберите манекен или загрузите своё фото в полный рост при хорошем свете.',
        'Результат готов за 30–60 секунд и сохраняется в «Образы».',
      ],
    },
    {
      illustration: 'looks',
      eyebrow: 'Образы · Календарь',
      title: 'Ваши образы по дням',
      bullets: [
        'Во вкладке «Образы» хранятся все результаты примерок.',
        '«Календарь» предлагает образ на каждый день недели — нажмите «Другой образ», чтобы сменить.',
      ],
    },
    {
      illustration: 'feed',
      eyebrow: 'Лента',
      title: 'Делитесь стилем',
      bullets: [
        'Выложите образ в ленту из вкладки «Образы» — кнопка «Выложить в ленту».',
        'Подписывайтесь, ставьте лайки и комментируйте образы других.',
        'Посты с примеркой собирают больше внимания.',
      ],
    },
    {
      illustration: 'diamonds',
      eyebrow: 'Алмазы · Премиум',
      title: 'Как оплачиваются действия ИИ',
      bullets: [
        'Алмазы тратятся на примерки, Beautify и генерацию образов — цена видна на каждой кнопке.',
        'Пополнить баланс — по кнопке с алмазом в шапке.',
        'Премиум даёт месячные лимиты вместо разовых пополнений — вкладка «Премиум».',
      ],
    },
  ],
  en: [
    {
      illustration: 'add',
      eyebrow: 'Closet',
      title: 'Add your clothes',
      bullets: [
        'Tap "Add item" and choose Gallery or Camera — several photos at once is fine.',
        'Any photo works: the AI removes the background and sorts each item into its category.',
        'No photo? Add pieces from the LIBAS shop with one tap.',
      ],
    },
    {
      illustration: 'beautify',
      eyebrow: 'Beautify',
      title: 'Photos that look like a shop',
      bullets: [
        'Check the category of each new item and fix it if the AI got it wrong.',
        'Beautify cleans up a photo — background gone, studio look. Compare before and after and keep the one you like.',
        'It costs a few diamonds per photo.',
      ],
    },
    {
      illustration: 'closet',
      eyebrow: 'Closet',
      title: 'Everything in its place',
      bullets: [
        'Items are grouped by category: filter with the chips or sort by date.',
        'Tap an item for details — colour, season, material and a "Try on" button.',
        '"Mark worn" keeps track of what you actually wear.',
      ],
    },
    {
      illustration: 'boards',
      eyebrow: 'Boards',
      title: 'Outfits by AI',
      bullets: [
        'Tap ✦ "Generate outfit" — the AI combines your pieces into a look. Tap ↻ for another one.',
        '"Edit" opens the editor: drag to move, pinch to resize, swap pieces from your closet or the shop.',
        'Save the board to come back to it later.',
      ],
    },
    {
      illustration: 'tryon',
      eyebrow: 'Try-on',
      title: 'See it on you',
      bullets: [
        'Tap "Try it on" on any board.',
        'Choose a mannequin or upload your own full-length photo taken in good light.',
        'The result takes 30–60 seconds and is saved to Outfits.',
      ],
    },
    {
      illustration: 'looks',
      eyebrow: 'Outfits · Calendar',
      title: 'Your looks, day by day',
      bullets: [
        'The Outfits tab keeps every try-on result in one gallery.',
        'The Calendar suggests a look for each day of the week — tap "Another look" to shuffle.',
      ],
    },
    {
      illustration: 'feed',
      eyebrow: 'Feed',
      title: 'Share your style',
      bullets: [
        'Post a look to the feed from the Outfits tab with "Share to feed".',
        'Follow people, like and comment on their outfits.',
        'Posts with a try-on get more attention.',
      ],
    },
    {
      illustration: 'diamonds',
      eyebrow: 'Diamonds · Premium',
      title: 'How AI actions are paid for',
      bullets: [
        'Diamonds pay for try-ons, Beautify and outfit generation — the price is shown on each button.',
        'Tap the diamond pill in the header to top up.',
        'Premium gives monthly limits instead of one-off top-ups — see the Premium tab.',
      ],
    },
  ],
};

/**
 * YouTube video URL for the guide. Paste the share/watch link or an embed URL —
 * `getYouTubeEmbedUrl` normalizes it. Leave empty to hide the video button.
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
