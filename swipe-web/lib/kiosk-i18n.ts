/**
 * Тексты киоска: русский и узбекский (латиница).
 *
 * Отдельно от lib/translations.ts сознательно: тот файл уже на 3000+ строк и общий
 * для мобильного веба, а киоск — другой продукт с другим тоном. Английского здесь
 * нет: в зале магазина он никому не нужен (ТЗ, раздел 2).
 */

export type KioskLang = 'ru' | 'uz';

type Pair = readonly [string, string];

export const KIOSK_TEXT = {
  // Заставка
  idleEyebrow: ['AI-стилист этого магазина', 'Bu doʻkonning AI-stilisti'],
  idleTitle: ['Примерьте образ', 'Uslubni kiyib koʻring'],
  idleTitleAccent: ['за 30 секунд', '30 soniyada'],
  ctaCreate: ['Создать образ', 'Uslub yaratish'],
  ctaCatalog: ['Посмотреть каталог', 'Katalogni koʻrish'],
  free: ['Бесплатно', 'Bepul'],

  // Как это работает
  introEyebrow: ['Три шага', 'Uch qadam'],
  introTitle: ['Как это работает', 'Bu qanday ishlaydi'],
  step1Title: ['Сфотографируйте лицо', 'Yuzingizni suratga oling'],
  step1Text: ['Одно фото, прямо здесь', 'Bitta surat, shu yerda'],
  step2Title: ['Ответьте на два вопроса', 'Ikki savolga javob bering'],
  step2Text: ['Пол и тип фигуры', 'Jins va tana tuzilishi'],
  step3Title: ['Смотрите образ', 'Uslubni koʻring'],
  step3Text: ['Только из вещей этого магазина', 'Faqat shu doʻkon kiyimlaridan'],
  introCta: ['Начать', 'Boshlash'],
  privacyLong: [
    'Фото лица хранится 15 минут и удаляется автоматически. Лицо на картинке мы не показываем, продавцы фото не видят.',
    'Yuz surati 15 daqiqa saqlanadi va avtomatik oʻchiriladi. Rasmda yuz koʻrsatilmaydi, sotuvchilar suratni koʻrmaydi.',
  ],

  // Камера
  privacyShort: ['Фото удалится через 15 минут', 'Surat 15 daqiqadan soʻng oʻchiriladi'],
  camAim: ['Поместите лицо в круг', 'Yuzingizni doira ichiga joylang'],
  camLook: ['Смотрите прямо в камеру', 'Toʻgʻridan-toʻgʻri kameraga qarang'],
  camDone: ['Хорошо получилось?', 'Yaxshi chiqdimi?'],
  camDoneHint: ['Лицо видно чётко, без теней', 'Yuz aniq koʻrinadi, soyasiz'],
  shoot: ['Снять', 'Suratga olish'],
  retake: ['Переснять', 'Qayta olish'],
  done: ['Готово', 'Tayyor'],
  camNoAccess: ['Нет доступа к камере. Позовите продавца', 'Kameraga ruxsat yoʻq. Sotuvchini chaqiring'],
  faceNotFound: ['Не вижу лицо. Встаньте ближе', 'Yuzni koʻrmayapman. Yaqinroq turing'],
  faceMultiple: ['В кадре несколько лиц', 'Kadrda bir nechta yuz bor'],
  faceCloser: ['Встаньте немного ближе', 'Biroz yaqinroq turing'],
  faceTooDark: ['Темновато — станьте к свету', 'Qorongʻi — yorugʻroq joyga turing'],
  uploadFailed: ['Не удалось отправить фото. Попробуйте ещё раз', 'Suratni yuborib boʻlmadi. Qayta urinib koʻring'],

  // Пол и фигура
  bodyTitle: ['Расскажите о себе', 'Oʻzingiz haqingizda'],
  bodySubtitle: [
    'Два ответа — и образ будет точно по вам.',
    'Ikki javob — uslub aynan sizga mos boʻladi.',
  ],
  qGender: ['Пол', 'Jins'],
  qShape: ['Тип фигуры', 'Tana tuzilishi'],
  female: ['Женский', 'Ayol'],
  male: ['Мужской', 'Erkak'],
  dontKnow: ['Не знаю', 'Bilmayman'],
  next: ['Дальше', 'Keyingisi'],

  // Стили
  styleTitle: ['Какой стиль вам ближе?', 'Sizga qaysi uslub yaqin?'],
  styleSubtitle: ['Можно выбрать несколько.', 'Bir nechtasini tanlash mumkin.'],

  // Каталог
  catalogTitle: ['Весь зал', 'Butun zal'],
  catalogSubtitle: [
    'Отметьте вещи, которые вам нравятся — примерим их на вас.',
    'Yoqqan kiyimlarni belgilang — ularni sizga kiyib koʻramiz.',
  ],
  catalogNext: ['Далее', 'Keyingisi'],
  picked: ['Выбрано', 'Tanlandi'],
  catalogEmpty: ['В этом магазине пока нет товаров с фото', 'Bu doʻkonda hozircha suratli mahsulot yoʻq'],

  // Генерация
  genTitle: ['Собираем образ', 'Uslub yigʻilmoqda'],
  gen1: ['Разбираем черты лица', 'Yuz xususiyatlarini oʻrganyapmiz'],
  gen2: ['Учитываем тип фигуры', 'Tana tuzilishini hisobga olyapmiz'],
  gen3: ['Подбираем вещи из зала', 'Zaldan kiyim tanlayapmiz'],
  gen4: ['Собираем образ', 'Uslubni yigʻyapmiz'],
  genAlmost: ['Ещё немного, почти готово', 'Ozgina qoldi, deyarli tayyor'],
  genFailed: ['Что-то пошло не так', 'Nimadir notoʻgʻri ketdi'],
  genRetry: ['Попробовать снова', 'Qayta urinib koʻrish'],
  genContinueInApp: ['Или продолжите в приложении по QR', 'Yoki QR orqali ilovada davom eting'],
  cancel: ['Отмена', 'Bekor qilish'],
  lookUnavailable: [
    'Из наличия этого магазина сейчас не собрать полный образ',
    'Hozir bu doʻkon mahsulotlaridan toʻliq uslub yigʻib boʻlmaydi',
  ],

  // Результат
  resultTag: ['Ваш образ', 'Sizning uslubingiz'],
  itemsCount: ['вещи', 'ta buyum'],
  qrTitle: ['Заберите образ в телефон', 'Uslubni telefonga oling'],
  qrSubtitle: [
    'Наведите камеру — фото, размеры и цены сохранятся в приложении LIBAS.',
    'Kamerani qarating — surat, oʻlchamlar va narxlar LIBAS ilovasida saqlanadi.',
  ],
  download: ['Скачать фото', 'Suratni yuklash'],
  downloadHint: [
    'Отсканируйте QR — фото сохранится в телефон',
    'QR-ni skanerlang — surat telefonga saqlanadi',
  ],
  regenerate: ['Пересобрать', 'Qayta yigʻish'],
  regenerateLeft: ['осталось', 'qoldi'],
  continueInApp: ['Продолжите в приложении', 'Ilovada davom eting'],
  collect: ['Собрать на примерку', 'Kiyib koʻrishga yigʻish'],

  // Состав образа
  buyTitle: ['Что на вас', 'Sizdagi kiyimlar'],
  buySubtitle: [
    'Все вещи есть в этом зале прямо сейчас.',
    'Barcha kiyimlar hozir shu zalda mavjud.',
  ],
  total: ['Итого', 'Jami'],
  sizeLabel: ['Размер', 'Oʻlcham'],
  inStock: ['в наличии', 'mavjud'],
  codeLabel: [
    'Назовите этот код продавцу — он соберёт вещи на примерку',
    'Bu kodni sotuvchiga ayting — u kiyimlarni tayyorlaydi',
  ],
  backToLook: ['Вернуться к образу', 'Uslubga qaytish'],
  sum: ['сум', 'soʻm'],

  // Служебное
  back: ['Назад', 'Orqaga'],
  stillHere: ['Вы ещё здесь?', 'Hali shu yerdamisiz?'],
  stillHereHint: ['Сессия закроется через', 'Sessiya yopiladi:'],
  imHere: ['Я здесь', 'Men shu yerdaman'],
  offlineTitle: ['Нет связи', 'Aloqa yoʻq'],
  offlineHint: ['Позовите, пожалуйста, продавца', 'Iltimos, sotuvchini chaqiring'],
  notConfigured: [
    'Планшет не настроен: нет ключа устройства',
    'Planshet sozlanmagan: qurilma kaliti yoʻq',
  ],
} as const satisfies Record<string, Pair>;

export type KioskTextKey = keyof typeof KIOSK_TEXT;

export function kioskText(key: KioskTextKey, lang: KioskLang): string {
  return KIOSK_TEXT[key][lang === 'uz' ? 1 : 0];
}

/** Стили с экрана выбора: код уходит на бэкенд, подпись показывается человеку. */
export const KIOSK_STYLES: ReadonlyArray<{ code: string; label: Pair }> = [
  { code: 'CLASSIC', label: ['Классика', 'Klassika'] },
  { code: 'CASUAL', label: ['Кэжуал', 'Kundalik'] },
  { code: 'MODEST_CHIC', label: ['Модест', 'Modest'] },
  { code: 'EVENING', label: ['Вечерний', 'Kechki'] },
  { code: 'OFFICE_SMART', label: ['Деловой', 'Ishbop'] },
  { code: 'SPORTY', label: ['Спорт-шик', 'Sport-shik'] },
];

/** Типы фигуры. Набор зависит от пола, вариант «не знаю» есть всегда. */
export const KIOSK_SHAPES: Record<'FEMALE' | 'MALE', ReadonlyArray<{ code: string; label: Pair }>> = {
  FEMALE: [
    { code: 'HOURGLASS', label: ['Песочные часы', 'Qum soati'] },
    { code: 'PEAR', label: ['Груша', 'Nok'] },
    { code: 'APPLE', label: ['Яблоко', 'Olma'] },
    { code: 'RECTANGLE', label: ['Прямоугольник', 'Toʻgʻri toʻrtburchak'] },
    { code: 'INVERTED_TRIANGLE', label: ['Перевёрнутый', 'Teskari uchburchak'] },
  ],
  MALE: [
    { code: 'RECTANGLE', label: ['Прямоугольник', 'Toʻgʻri toʻrtburchak'] },
    { code: 'INVERTED_TRIANGLE', label: ['Треугольник', 'Uchburchak'] },
    { code: 'TRIANGLE', label: ['Прямой', 'Toʻgʻri'] },
    { code: 'OVAL', label: ['Овал', 'Oval'] },
  ],
};

/** Цена в узбекских сумах: пробелы между разрядами, как на ценниках в зале. */
export function kioskMoney(value: number, lang: KioskLang): string {
  return `${value.toLocaleString('ru-RU').replace(/,/g, ' ')} ${kioskText('sum', lang)}`;
}
