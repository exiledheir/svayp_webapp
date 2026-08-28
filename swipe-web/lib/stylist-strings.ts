import type { Locale } from './translations';
import type { FeedbackReason } from './stylist';

/**
 * Строки AI-стилиста на трёх языках.
 *
 * Отдельный словарь, а не общий `translations.ts` — по образцу `closet-guide.ts`: фича
 * большая, строк много, и держать их рядом с экраном проще, чем разносить по гигантскому
 * общему интерфейсу.
 *
 * Узбекский — латиница: так пишет остальное приложение.
 */
export interface StylistStrings {
  title: string;
  beta: string;
  greeting: string;
  greetingHint: string;
  inputPlaceholder: string;
  thinking: string;
  send: string;
  attachPhoto: string;
  removePhoto: string;
  photoOne: string;
  photoMany: (n: number) => string;

  errorGeneric: string;
  errorPhoto: string;
  errorCoins: string;
  errorSaveOutfit: string;
  errorNoWardrobeItems: string;
  errorOutfitNeedsClothing: string;
  errorItemNotReady: string;

  saveOutfit: string;
  saving: string;
  openInCloset: string;
  inWardrobe: string;
  pickUp: string;
  howWorn: string;
  yourItem: string;
  findInCatalog: string;
  noReferences: string;

  unavailableTitle: string;
  unavailableText: string;
  goBack: string;

  starters: string[];
  /** Коды строго те же, что у бэкенда — подписи переводятся, коды нет. */
  feedbackReasons: { code: FeedbackReason; label: string }[];
  refunded: (coins: number) => string;

  profileTitle: string;
  profileFilled: string;
  profileUnknown: string;
  profileEditHint: string;
  profileDeleteHint: string;
  editField: (label: string) => string;

  newChat: string;
  chatList: string;
  noChats: string;
  deleteChat: string;
  clearHistory: string;
  clearHistoryConfirm: string;
  cancel: string;
  emptyChat: string;
  sourceLabels: Record<string, string>;
  confidence: (pct: number) => string;
}

const RU: StylistStrings = {
  title: 'Nur',
  beta: 'бета',
  greeting: 'Привет! Я Nur, твой стилист ✨',
  greetingHint: 'Спроси что угодно про стиль — или пришли фото вещи, и я соберу образ вокруг неё.',
  inputPlaceholder: 'Напиши Nur…',
  thinking: 'Работаю над этим…',
  send: 'Отправить',
  attachPhoto: 'Прикрепить фото',
  removePhoto: 'Убрать фото',
  photoOne: '📷 Фото',
  photoMany: (n) => `📷 ${n} фото`,

  errorGeneric: 'Не получилось ответить. Попробуй ещё раз',
  errorPhoto: 'Не получилось загрузить фото. Попробуй ещё раз',
  errorCoins: 'Не хватает монет на это действие',
  errorSaveOutfit: 'Не получилось сохранить образ',
  errorNoWardrobeItems: 'В этом образе нет вещей из твоего гардероба — сначала добавь их',
  errorOutfitNeedsClothing: 'В образе нужна хотя бы одна вещь одежды или обуви, аксессуаров мало',
  errorItemNotReady: 'Одна из вещей ещё обрабатывается — попробуй через минуту',

  saveOutfit: 'Сохранить образ',
  saving: 'Сохраняю…',
  openInCloset: 'Открыть в гардеробе',
  inWardrobe: '🟢 есть у тебя',
  pickUp: 'подобрать',
  howWorn: 'Как такое носят',
  yourItem: '📷 твоя вещь',
  findInCatalog: 'Найти в каталоге',
  noReferences: 'Примеров не нашлось',

  unavailableTitle: 'Nur пока недоступна',
  unavailableText: 'Стилист открыт ограниченному кругу. Мы включим его для всех чуть позже.',
  goBack: 'Вернуться',

  starters: [
    'Помоги определить мой стиль',
    'Собери образ вокруг этой вещи',
    'Какой фасон подходит моей фигуре?',
    'Что надеть вниз к этой рубашке?',
    'Оцени мой образ',
    'Чего не хватает в моём гардеробе?',
  ],
  feedbackReasons: [
    { code: 'OFF_TOPIC', label: 'Не по теме' },
    { code: 'TOO_GENERIC', label: 'Слишком общо' },
    { code: 'NOT_FOR_ME', label: 'Не подходит мне' },
    { code: 'UGLY_OUTFIT', label: 'Некрасивый образ' },
    { code: 'BAD_PHOTO_READ', label: 'Не понял фото' },
  ],
  refunded: (coins) => `Вернули 🪙 ${coins}`,

  profileTitle: 'Мой стилевой профиль',
  profileFilled: 'Заполнен на',
  profileUnknown: 'пока не знаю',
  profileEditHint:
    'Nur иногда ошибается — например, в цветотипе. Поправленное вручную она больше не перезапишет, даже если ты пришлёшь новое фото.',
  profileDeleteHint: 'Оставь пустым, чтобы удалить',
  editField: (label) => `Изменить: ${label}`,

  newChat: 'Новый чат',
  chatList: 'Мои разговоры',
  noChats: 'Пока нет разговоров',
  deleteChat: 'Удалить разговор',
  clearHistory: 'Очистить историю',
  clearHistoryConfirm: 'Стереть все разговоры? Профиль и настройки останутся.',
  cancel: 'Отмена',
  emptyChat: 'Пустой разговор',
  sourceLabels: {
    PHOTO_INFERRED: 'определено по фото',
    USER_ANSWERED: 'ты сказала',
    DERIVED_FROM_SWIPES: 'из твоих свайпов',
    MANUAL_EDIT: 'исправлено вручную',
  },
  confidence: (pct) => ` · уверенность ${pct}%`,
};

const UZ: StylistStrings = {
  title: 'Nur',
  beta: 'beta',
  greeting: 'Salom! Men Nur, sizning stilistingizman ✨',
  greetingHint:
    'Uslub haqida istalgan narsani so‘rang — yoki kiyim suratini yuboring, men uning atrofida obraz yig‘aman.',
  inputPlaceholder: 'Nur’ga yozing…',
  thinking: 'Ustida ishlayapman…',
  send: 'Yuborish',
  attachPhoto: 'Surat biriktirish',
  removePhoto: 'Suratni olib tashlash',
  photoOne: '📷 Surat',
  photoMany: (n) => `📷 ${n} ta surat`,

  errorGeneric: 'Javob bera olmadim. Yana urinib ko‘ring',
  errorPhoto: 'Suratni yuklab bo‘lmadi. Yana urinib ko‘ring',
  errorCoins: 'Bu amal uchun tanga yetarli emas',
  errorSaveOutfit: 'Obrazni saqlab bo‘lmadi',
  errorNoWardrobeItems: 'Bu obrazda sizning garderobingizdagi kiyimlar yo‘q — avval ularni qo‘shing',
  errorOutfitNeedsClothing: 'Obrazda kamida bitta kiyim yoki poyabzal bo‘lishi kerak, aksessuar yetarli emas',
  errorItemNotReady: 'Kiyimlardan biri hali qayta ishlanmoqda — bir daqiqadan so‘ng urinib ko‘ring',

  saveOutfit: 'Obrazni saqlash',
  saving: 'Saqlanmoqda…',
  openInCloset: 'Garderobda ochish',
  inWardrobe: '🟢 sizda bor',
  pickUp: 'tanlash',
  howWorn: 'Buni qanday kiyishadi',
  yourItem: '📷 sizning kiyimingiz',
  findInCatalog: 'Katalogdan topish',
  noReferences: 'Namunalar topilmadi',

  unavailableTitle: 'Nur hozircha mavjud emas',
  unavailableText: 'Stilist cheklangan doiraga ochilgan. Tez orada hamma uchun yoqamiz.',
  goBack: 'Orqaga',

  starters: [
    'Uslubimni aniqlashga yordam bering',
    'Shu kiyim atrofida obraz yig‘ing',
    'Menga qanday fason mos keladi?',
    'Bu ko‘ylak ostiga nima kiyay?',
    'Obrazimni baholang',
    'Garderobimda nima yetishmayapti?',
  ],
  feedbackReasons: [
    { code: 'OFF_TOPIC', label: 'Mavzuga aloqasiz' },
    { code: 'TOO_GENERIC', label: 'Juda umumiy' },
    { code: 'NOT_FOR_ME', label: 'Menga mos emas' },
    { code: 'UGLY_OUTFIT', label: 'Chiroyli emas' },
    { code: 'BAD_PHOTO_READ', label: 'Suratni tushunmadi' },
  ],
  refunded: (coins) => `🪙 ${coins} qaytarildi`,

  profileTitle: 'Mening uslub profilim',
  profileFilled: 'To‘ldirilgan',
  profileUnknown: 'hali bilmayman',
  profileEditHint:
    'Nur ba’zan xato qiladi — masalan, rang turida. Qo‘lda tuzatilganini u boshqa qayta yozmaydi, hatto yangi surat yuborsangiz ham.',
  profileDeleteHint: 'O‘chirish uchun bo‘sh qoldiring',
  editField: (label) => `O‘zgartirish: ${label}`,

  newChat: 'Yangi suhbat',
  chatList: 'Mening suhbatlarim',
  noChats: 'Hozircha suhbatlar yo‘q',
  deleteChat: 'Suhbatni o‘chirish',
  clearHistory: 'Tarixni tozalash',
  clearHistoryConfirm: 'Barcha suhbatlar o‘chirilsinmi? Profil va sozlamalar qoladi.',
  cancel: 'Bekor qilish',
  emptyChat: 'Bo‘sh suhbat',
  sourceLabels: {
    PHOTO_INFERRED: 'suratdan aniqlandi',
    USER_ANSWERED: 'siz aytdingiz',
    DERIVED_FROM_SWIPES: 'svayplaringizdan',
    MANUAL_EDIT: 'qo‘lda tuzatilgan',
  },
  confidence: (pct) => ` · ishonch ${pct}%`,
};

const EN: StylistStrings = {
  title: 'Nur',
  beta: 'beta',
  greeting: 'Hi! I’m Nur, your stylist ✨',
  greetingHint: 'Ask me anything about style — or send a photo of an item and I’ll build an outfit around it.',
  inputPlaceholder: 'Message Nur…',
  thinking: 'Working on it…',
  send: 'Send',
  attachPhoto: 'Attach photo',
  removePhoto: 'Remove photo',
  photoOne: '📷 Photo',
  photoMany: (n) => `📷 ${n} photos`,

  errorGeneric: 'Couldn’t answer. Please try again',
  errorPhoto: 'Couldn’t upload the photo. Please try again',
  errorCoins: 'Not enough coins for this action',
  errorSaveOutfit: 'Couldn’t save the outfit',
  errorNoWardrobeItems: 'This outfit has no items from your wardrobe — add them first',
  errorOutfitNeedsClothing: 'An outfit needs at least one clothing or footwear item — accessories alone won’t do',
  errorItemNotReady: 'One of the items is still processing — try again in a minute',

  saveOutfit: 'Save outfit',
  saving: 'Saving…',
  openInCloset: 'Open in wardrobe',
  inWardrobe: '🟢 you have it',
  pickUp: 'find one',
  howWorn: 'How it’s worn',
  yourItem: '📷 your item',
  findInCatalog: 'Find in catalog',
  noReferences: 'No examples found',

  unavailableTitle: 'Nur isn’t available yet',
  unavailableText: 'The stylist is open to a limited group. We’ll turn it on for everyone soon.',
  goBack: 'Go back',

  starters: [
    'Help me define my style',
    'Build an outfit around this item',
    'What silhouette suits my figure?',
    'What should I wear with this shirt?',
    'Rate my outfit',
    'What’s missing from my wardrobe?',
  ],
  feedbackReasons: [
    { code: 'OFF_TOPIC', label: 'Off topic' },
    { code: 'TOO_GENERIC', label: 'Too generic' },
    { code: 'NOT_FOR_ME', label: 'Not for me' },
    { code: 'UGLY_OUTFIT', label: 'Unattractive outfit' },
    { code: 'BAD_PHOTO_READ', label: 'Misread the photo' },
  ],
  refunded: (coins) => `🪙 ${coins} refunded`,

  profileTitle: 'My style profile',
  profileFilled: 'Complete',
  profileUnknown: 'not known yet',
  profileEditHint:
    'Nur sometimes gets things wrong — colour type, for instance. Anything you fix by hand stays fixed, even if you send a new photo.',
  profileDeleteHint: 'Leave empty to remove',
  editField: (label) => `Edit: ${label}`,

  newChat: 'New chat',
  chatList: 'My conversations',
  noChats: 'No conversations yet',
  deleteChat: 'Delete conversation',
  clearHistory: 'Clear history',
  clearHistoryConfirm: 'Delete all conversations? Your profile and settings stay.',
  cancel: 'Cancel',
  emptyChat: 'Empty conversation',
  sourceLabels: {
    PHOTO_INFERRED: 'from your photo',
    USER_ANSWERED: 'you told me',
    DERIVED_FROM_SWIPES: 'from your swipes',
    MANUAL_EDIT: 'edited by you',
  },
  confidence: (pct) => ` · ${pct}% confident`,
};

const STRINGS: Record<Locale, StylistStrings> = { ru: RU, uz: UZ, en: EN };

/** Узбекский как фолбэк — так же, как в гиде по гардеробу. */
export function getStylistStrings(locale: Locale): StylistStrings {
  return STRINGS[locale] ?? STRINGS.uz;
}
