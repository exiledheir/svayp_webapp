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
/**
 * Вопрос знакомства.
 *
 * <p>У варианта есть подпись и значение. Подпись переводится, значение — нет: оно
 * пишется в профиль и читается бэкендом как есть. `isModest` на сервере сравнивает
 * закрытость со строкой «без ограничений», и узбекское «Cheklovsiz» в профиле
 * включило бы закрытый стиль человеку, который просил обратного.
 */
export interface OnboardingStep {
  field: 'style' | 'modesty' | 'lifestyle' | 'height_range';
  question: string;
  hint?: string;
  /** value = null — «не знаю»: поле не пишем вовсе. */
  options: { label: string; value: string | null }[];
}

export interface OnboardingStrings {
  hello: string;
  tagline: string;
  showYourself: string;
  photoPitch: string;
  pickPhoto: string;
  later: string;
  skip: string;
  stepOf: (step: number, total: number) => string;
  steps: OnboardingStep[];
}

/** Значения профиля — единые для всех языков: их читает бэкенд. */
const STYLE_VALUES = ['Минимализм', 'Классика', 'Casual', 'Романтичный', 'Спортивный'];
const MODESTY_VALUES = ['Закрытая одежда', 'Умеренно', 'Без ограничений'];
const LIFESTYLE_VALUES = ['Офис', 'Учёба', 'Дома и прогулки', 'Много встреч', 'Творческая работа'];
const HEIGHT_VALUES = ['до 160 см', '160–170 см', '170–180 см', 'выше 180 см'];

/** Склеить переведённые подписи с общими значениями; последний вариант «не знаю» — null. */
function withValues(labels: string[], values: string[], unknown?: string) {
  const out: { label: string; value: string | null }[] = labels.map((label, i) => ({
    label,
    value: values[i],
  }));
  if (unknown) out.push({ label: unknown, value: null });
  return out;
}

export type SlotLabels = Record<'TOP' | 'BOTTOM' | 'SHOES' | 'OUTER' | 'ACCESSORY' | 'HEADSCARF', string>;

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
  /** Ответа нет дольше, чем сервер вообще может думать: точки не должны крутиться вечно. */
  errorTimeout: string;
  /** Модель перегружена (429): говорим прямо и сразу, а не общим «не получилось». */
  errorBusy: string;
  errorFiltered: string;
  profileFields: Record<string, string>;
  profileHints: Record<string, string>;
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
  howWorn: string;
  yourItem: string;
  close: string;
  shoppingTitle: string;
  whatWasWrong: string;
  constraintsApplied: (list: string) => string;
  savePartial: (count: number) => string;
  uploading: string;
  takeThisItem: string;
  addingItem: string;
  itemAdded: string;
  itemAddFailed: string;
  itemQuotaFull: string;
  /** Подписи ролей в карточке образа: раньше были только по-русски на всех языках. */
  slotLabels: SlotLabels;
  /** Знакомство целиком: раньше экран был по-русски и у узбекских, и у английских пользователей. */
  onboarding: OnboardingStrings;
  openSource: string;

  unavailableTitle: string;
  unavailableText: string;
  /** Chip on the "not available yet" screen — the Nur tab is visible to everyone. */
  comingSoon: string;
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
  errorTimeout: 'Nur думает слишком долго. Попробуй ещё раз',
  errorBusy: 'Nur сейчас перегружена — попробуй через минуту',
  errorFiltered: 'Не смогла ответить на это сообщение — перефразируй, пожалуйста',
  profileFields: {
    name: 'Имя',
    age: 'Возраст',
    body_shape: 'Тип фигуры',
    colortype: 'Цветотип',
    style: 'Стиль',
    modesty: 'Ограничения',
    lifestyle: 'Образ жизни',
    height_range: 'Рост',
    avoid: 'Не предлагать',
  },
  profileHints: {
    PHOTO: 'Пришли Nur фото в полный рост — она определит цветотип и фигуру, и советы станут точнее',
    LIFESTYLE: 'Расскажи Nur про свой обычный день — она подберёт образы под него, а не наугад',
    DONE: 'Профиль собран. Если что-то не так — поправь, Nur учтёт это в следующих ответах',
  },
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
  howWorn: 'Как такое носят',
  yourItem: '📷 твоя вещь',
  close: 'Закрыть',
  shoppingTitle: 'Что стоит добавить',
  whatWasWrong: 'Что именно не подошло?',
  constraintsApplied: (list) => `Не предлагаю: ${list} · изменить`,
  savePartial: (n) =>
    `${n === 1 ? 'Одна вещь' : `${n} вещи`} здесь из интернета — добавлю ${n === 1 ? 'её' : 'их'} в твой гардероб при сохранении. Хочешь другое фото — выбери его выше.`,
  uploading: 'Загружаю…',
  takeThisItem: 'Взять эту вещь',
  addingItem: 'Добавляю в гардероб…',
  itemAdded: '🟢 добавлено в гардероб',
  itemAddFailed: 'Не получилось добавить это фото. Попробуй другое.',
  itemQuotaFull: 'В гардеробе кончилось место — освободи его или расширь тариф.',
  slotLabels: {
    TOP: 'Верх',
    BOTTOM: 'Низ',
    OUTER: 'Верхний слой',
    SHOES: 'Обувь',
    HEADSCARF: 'Платок',
    ACCESSORY: 'Аксессуары',
  },
  onboarding: {
    hello: 'Привет, я Nur',
    tagline: 'Твой личный стилист. «Nur» значит «свет» — помогу увидеть, что тебе идёт.',
    showYourself: 'Покажи себя',
    photoPitch:
      'По фото в полный рост я определю цветотип, пропорции и подберу оттенки — советы станут точными, а не общими. Фото видно только тебе.',
    pickPhoto: 'Выбрать или снять фото',
    later: 'Позже',
    skip: 'Пропустить',
    stepOf: (step, total) => `Шаг ${step} из ${total}`,
    steps: [
      {
        field: 'style',
        question: 'Какой стиль тебе ближе?',
        hint: 'Можно поменять в любой момент',
        options: withValues(STYLE_VALUES, STYLE_VALUES, 'Пока не знаю'),
      },
      {
        field: 'modesty',
        question: 'Есть ли пожелания по закрытости?',
        options: withValues(MODESTY_VALUES, MODESTY_VALUES),
      },
      {
        field: 'lifestyle',
        question: 'Где ты бываешь чаще всего?',
        hint: 'От этого зависит, что попадёт в образы',
        options: withValues(LIFESTYLE_VALUES, LIFESTYLE_VALUES),
      },
      {
        field: 'height_range',
        question: 'Твой рост?',
        hint: 'Нужен для пропорций — цифры спрашивать не буду',
        options: withValues(HEIGHT_VALUES, HEIGHT_VALUES),
      },
    ],
  },
  openSource: 'Открыть источник',

  unavailableTitle: 'Nur пока недоступна',
  unavailableText: 'Стилист открыт ограниченному кругу. Мы включим его для всех чуть позже.',
  comingSoon: 'Скоро',
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
  greeting: 'Salom! Men Nur, sening stilistingman ✨',
  greetingHint:
    'Uslub haqida istalgan narsani so‘ra — yoki kiyim suratini yubor, men uning atrofida obraz yig‘aman.',
  inputPlaceholder: 'Nur’ga yozing…',
  thinking: 'Ustida ishlayapman…',
  send: 'Yuborish',
  attachPhoto: 'Surat biriktirish',
  removePhoto: 'Suratni olib tashlash',
  photoOne: '📷 Surat',
  photoMany: (n) => `📷 ${n} ta surat`,

  errorGeneric: 'Javob bera olmadim. Yana urinib ko‘ring',
  errorTimeout: 'Nur juda uzoq o‘ylayapti. Yana urinib ko‘ring',
  errorBusy: 'Nur hozir band — bir daqiqadan keyin urinib ko‘ring',
  errorFiltered: 'Bu xabarga javob bera olmadim — iltimos, boshqacha yozib ko‘ring',
  profileFields: {
    name: 'Ism',
    age: 'Yosh',
    body_shape: 'Qomat turi',
    colortype: 'Rang tipi',
    style: 'Uslub',
    modesty: 'Cheklovlar',
    lifestyle: 'Turmush tarzi',
    height_range: 'Bo‘y',
    avoid: 'Taklif qilmaslik',
  },
  profileHints: {
    PHOTO: 'Nurga to‘liq bo‘yli surat yubor — u rang tipi va qomatni aniqlaydi, maslahatlar aniqroq bo‘ladi',
    LIFESTYLE: 'Nurga oddiy kuning qanday o‘tishini ayt — obrazlarni taxminan emas, shunga qarab tanlaydi',
    DONE: 'Profil to‘ldirildi. Biror narsa to‘g‘ri bo‘lmasa — tuzat, Nur keyingi javoblarda hisobga oladi',
  },
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
  howWorn: 'Buni qanday kiyishadi',
  yourItem: '📷 sizning kiyimingiz',
  close: 'Yopish',
  shoppingTitle: 'Nimani qo‘shish kerak',
  whatWasWrong: 'Aynan nima to‘g‘ri kelmadi?',
  constraintsApplied: (list) => `Taklif qilmayman: ${list} · o‘zgartirish`,
  savePartial: (n) =>
    `Bu yerda ${n} ta kiyim internetdan — saqlashda ularni garderobingizga qo‘shaman. Boshqa rasm kerak bo‘lsa, yuqoridan tanlang.`,
  uploading: 'Yuklanmoqda…',
  takeThisItem: 'Bu kiyimni olish',
  addingItem: 'Garderobga qo‘shilmoqda…',
  itemAdded: '🟢 garderobga qo‘shildi',
  itemAddFailed: 'Bu rasmni qo‘shib bo‘lmadi. Boshqasini tanlang.',
  itemQuotaFull: 'Garderobda joy tugadi — joy bo‘shating yoki tarifni kengaytiring.',
  slotLabels: {
    TOP: 'Ust',
    BOTTOM: 'Past',
    OUTER: 'Ustki kiyim',
    SHOES: 'Poyabzal',
    HEADSCARF: 'Ro‘mol',
    ACCESSORY: 'Aksessuarlar',
  },
  onboarding: {
    hello: 'Salom, men Nur',
    tagline: 'Shaxsiy stilistingiz. «Nur» — yorug‘lik degani: sizga nima yarashishini ko‘rishga yordam beraman.',
    showYourself: 'O‘zingizni ko‘rsating',
    photoPitch:
      'To‘liq bo‘yli rasmingizdan rang tipingiz va proporsiyalaringizni aniqlayman, mos ranglarni tanlayman — maslahatlar umumiy emas, aniq bo‘ladi. Rasmni faqat siz ko‘rasiz.',
    pickPhoto: 'Rasm tanlash yoki suratga olish',
    later: 'Keyinroq',
    skip: 'O‘tkazib yuborish',
    stepOf: (step, total) => `${step}-qadam, jami ${total}`,
    steps: [
      {
        field: 'style',
        question: 'Qaysi uslub sizga yaqinroq?',
        hint: 'Istalgan vaqtda o‘zgartirish mumkin',
        options: withValues(
          ['Minimalizm', 'Klassika', 'Casual', 'Romantik', 'Sport uslubi'],
          STYLE_VALUES,
          'Hozircha bilmayman',
        ),
      },
      {
        field: 'modesty',
        question: 'Kiyim yopiqligi bo‘yicha istaklaringiz bormi?',
        options: withValues(['Yopiq kiyim', 'O‘rtacha', 'Cheklovsiz'], MODESTY_VALUES),
      },
      {
        field: 'lifestyle',
        question: 'Ko‘pincha qayerda bo‘lasiz?',
        hint: 'Obrazlarga nima tushishi shunga bog‘liq',
        options: withValues(['Ofis', 'O‘qish', 'Uy va sayr', 'Ko‘p uchrashuvlar', 'Ijodiy ish'], LIFESTYLE_VALUES),
      },
      {
        field: 'height_range',
        question: 'Bo‘yingiz qancha?',
        hint: 'Proporsiyalar uchun kerak — aniq raqam so‘ramayman',
        options: withValues(['160 sm gacha', '160–170 sm', '170–180 sm', '180 sm dan baland'], HEIGHT_VALUES),
      },
    ],
  },
  openSource: 'Manbani ochish',

  unavailableTitle: 'Nur hozircha mavjud emas',
  unavailableText: 'Stilist cheklangan doiraga ochilgan. Tez orada hamma uchun yoqamiz.',
  comingSoon: 'Tez orada',
  goBack: 'Orqaga',

  starters: [
    'Uslubimni aniqlashga yordam ber',
    'Shu kiyim atrofida obraz yig‘',
    'Menga qanday fason mos keladi?',
    'Bu ko‘ylak ostiga nima kiyay?',
    'Obrazimni baholab ber',
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
  errorTimeout: 'Nur is taking too long. Please try again',
  errorBusy: 'Nur is busy right now — try again in a minute',
  errorFiltered: 'I couldn’t answer that message — could you rephrase it?',
  profileFields: {
    name: 'Name',
    age: 'Age',
    body_shape: 'Body shape',
    colortype: 'Colour type',
    style: 'Style',
    modesty: 'Coverage',
    lifestyle: 'Lifestyle',
    height_range: 'Height',
    avoid: 'Never suggest',
  },
  profileHints: {
    PHOTO: 'Send Nur a full-length photo — she’ll work out your colour type and shape, and the advice gets sharper',
    LIFESTYLE: 'Tell Nur about your usual day — she’ll build outfits for it instead of guessing',
    DONE: 'Profile is complete. If something looks off, fix it and Nur will use that next time',
  },
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
  howWorn: 'How it’s worn',
  yourItem: '📷 your item',
  close: 'Close',
  shoppingTitle: 'Worth adding',
  whatWasWrong: 'What exactly didn’t work?',
  constraintsApplied: (list) => `Not suggesting: ${list} · change`,
  savePartial: (n) =>
    `${n === 1 ? 'One piece' : `${n} pieces`} here come from the web — I'll add ${n === 1 ? 'it' : 'them'} to your wardrobe when saving. Want a different photo? Pick one above.`,
  uploading: 'Uploading…',
  takeThisItem: 'Take this piece',
  addingItem: 'Adding to wardrobe…',
  itemAdded: '🟢 added to wardrobe',
  itemAddFailed: 'Couldn’t add this photo. Try another one.',
  itemQuotaFull: 'Your wardrobe is full — free up space or upgrade your plan.',
  slotLabels: {
    TOP: 'Top',
    BOTTOM: 'Bottom',
    OUTER: 'Outer layer',
    SHOES: 'Shoes',
    HEADSCARF: 'Headscarf',
    ACCESSORY: 'Accessories',
  },
  onboarding: {
    hello: 'Hi, I’m Nur',
    tagline: 'Your personal stylist. “Nur” means “light” — I’ll help you see what suits you.',
    showYourself: 'Show me you',
    photoPitch:
      'From a full-length photo I’ll work out your colour type and proportions and pick your shades — so the advice gets specific, not generic. Only you can see the photo.',
    pickPhoto: 'Choose or take a photo',
    later: 'Later',
    skip: 'Skip',
    stepOf: (step, total) => `Step ${step} of ${total}`,
    steps: [
      {
        field: 'style',
        question: 'Which style feels most like you?',
        hint: 'You can change it any time',
        options: withValues(['Minimalism', 'Classic', 'Casual', 'Romantic', 'Sporty'], STYLE_VALUES, 'Not sure yet'),
      },
      {
        field: 'modesty',
        question: 'Any preferences on coverage?',
        options: withValues(['Modest, covered', 'Moderate', 'No restrictions'], MODESTY_VALUES),
      },
      {
        field: 'lifestyle',
        question: 'Where do you spend most of your time?',
        hint: 'This shapes what goes into your outfits',
        options: withValues(['Office', 'Studies', 'Home and walks', 'Lots of meetings', 'Creative work'], LIFESTYLE_VALUES),
      },
      {
        field: 'height_range',
        question: 'Your height?',
        hint: 'Needed for proportions — I won’t ask for exact numbers',
        options: withValues(['under 160 cm', '160–170 cm', '170–180 cm', 'over 180 cm'], HEIGHT_VALUES),
      },
    ],
  },
  openSource: 'Open source',

  unavailableTitle: 'Nur isn’t available yet',
  unavailableText: 'The stylist is open to a limited group. We’ll turn it on for everyone soon.',
  comingSoon: 'Coming soon',
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
