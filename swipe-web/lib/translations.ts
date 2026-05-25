export type Locale = 'en' | 'ru' | 'uz';

export interface Translations {
  today: string;
  weekend: string;
  nextSevenDays: string;
  myOutfits: string;
  newOutfit: string;
  addPiecesToBuildIt: string;
  viewItems: string;
  tryItOn: string;
  yourStyleStartsHere: string;
  tapPlusToAddFirstPiece: string;
  addTopAndBottom: string;
  upperBody: string;
  lowerBody: string;
  shoes: string;
  accessories: string;
  viewAll: string;
  all: string;
  addPhoto: string;
  photoLibrary: string;
  chooseFromYourPhotos: string;
  camera: string;
  takeANewPhoto: string;
  addToCloset: string;
  category: string;
  saveToCloset: string;
  uploading: string;
  delete: string;
  save: string;
  noItemsYet: string;
  language: string;
  upgradeToGetMore: string;
  addItemsFirst: string;
  items: string;
  calendar: string;
  choosePlan: string;
  currentPlan: string;
  upgrade: string;
  monthly: string;
  yearly: string;
  sumPerMo: string;
  sumPerYear: string;
  itemsPerCat: string;
  outfitCanvases: string;
  regens: string;
  tryOns: string;
  calDays: string;
  reachedRegenLimit: string;
  reachedItemLimit: string;
  discoverFashion: string;
  phoneNumber: string;
  continueBtn: string;
  sending: string;
  enterAtLeast9: string;
  enterCodeSentTo: string;
  confirmBtn: string;
  changeNumber: string;
  verifying: string;
  enterFull6Digit: string;
  onboarding_slide1_title: string;
  onboarding_slide1_body: string;
  onboarding_slide2_title: string;
  onboarding_slide2_body: string;
  onboarding_slide2_original: string;
  onboarding_slide2_aiflat: string;
  onboarding_slide3_title: string;
  onboarding_slide3_body: string;
  onboarding_slide4_title: string;
  onboarding_slide4_body: string;
  onboarding_slide5_title: string;
  onboarding_slide5_body: string;
  onboarding_cta_title: string;
  onboarding_cta_body: string;
  onboarding_btn_next: string;
  onboarding_btn_skip: string;
  onboarding_btn_add_item: string;
  tryOnConfirmTitle: string;
  tryOnConfirmBody: string;
  tryOnCancel: string;
  tryOnConfirm: string;
  tryOnStarting: string;
  tryOnGenerating: string;
  tryOnStyleTip: string;
  tryOnFailedTitle: string;
  close: string;
  retry: string;
  myLooks: string;
  myLooksSaved: string;
  myLooksEmpty: string;
  myLooksEmptyHint: string;
  myLooksSaveLook: string;
  justNow: string;
  minutesAgo: string;
  today: string;
  yesterday: string;
  cats: {
    tops: string;
    tshirts: string;
    blouses: string;
    dresses: string;
    jumpsuits: string;
    jackets: string;
    skirts: string;
    jeans: string;
    pants: string;
    shorts: string;
    shoes: string;
    sneakers: string;
    heels: string;
    boots: string;
    sandals: string;
    flats: string;
    bags: string;
    accessories: string;
    shawl: string;
    jewelry: string;
    underwear: string;
  };
}

const en: Translations = {
  today: 'Today',
  weekend: 'Weekend',
  nextSevenDays: 'Next 7 Days',
  myOutfits: 'My Outfits',
  newOutfit: 'New Outfit',
  addPiecesToBuildIt: 'Add pieces to build it',
  viewItems: 'Edit',
  tryItOn: 'Try it on',
  yourStyleStartsHere: 'Your style starts here.',
  tapPlusToAddFirstPiece: 'Tap + to add your first piece.',
  addTopAndBottom: 'Add at least one top and one bottom or shoes to generate an outfit.',
  upperBody: 'Upper Body',
  lowerBody: 'Lower Body',
  shoes: 'Shoes',
  accessories: 'Accessories',
  viewAll: 'View all',
  all: 'All',
  addPhoto: 'Add Photo',
  photoLibrary: 'Photo Library',
  chooseFromYourPhotos: 'Choose from your photos',
  camera: 'Camera',
  takeANewPhoto: 'Take a new photo',
  addToCloset: 'Add to Closet',
  category: 'Category',
  saveToCloset: 'Save to Closet',
  uploading: 'Uploading…',
  delete: 'Delete',
  save: 'Save',
  noItemsYet: 'No items yet',
  language: 'Language',
  upgradeToGetMore: 'Upgrade to unlock',
  addItemsFirst: 'Add items to your closet first',
  items: 'items',
  calendar: 'Calendar',
  choosePlan: 'Choose Your Plan',
  currentPlan: 'Current',
  upgrade: 'Upgrade',
  monthly: 'Monthly',
  yearly: 'Yearly',
  sumPerMo: 'sum/mo',
  sumPerYear: 'sum/year',
  itemsPerCat: 'items per category',
  outfitCanvases: 'outfit boards',
  regens: 'outfit generations',
  tryOns: 'virtual try-ons',
  calDays: 'days in calendar',
  reachedRegenLimit: "You've used your {n} regenerations. Upgrade for more.",
  reachedItemLimit: 'You\'ve reached the {n} items/category limit.',
  discoverFashion: 'Discover fashion you love',
  phoneNumber: 'Phone number',
  continueBtn: 'Continue',
  sending: 'Sending…',
  enterAtLeast9: 'Enter at least 9 digits',
  enterCodeSentTo: 'Enter the code we sent to',
  confirmBtn: 'Confirm',
  changeNumber: 'Change number',
  verifying: 'Verifying…',
  enterFull6Digit: 'Enter the full 6-digit code',
  onboarding_slide1_title: 'Welcome to Your Closet',
  onboarding_slide1_body: 'Your personal AI-powered wardrobe. Style smarter, dress better.',
  onboarding_slide2_title: 'Build Your Wardrobe',
  onboarding_slide2_body: 'Upload any photo. Our AI removes the background and recreates your item in a clean flat style — ready to mix and match.',
  onboarding_slide2_original: 'Original',
  onboarding_slide2_aiflat: 'AI Flat Style',
  onboarding_slide3_title: 'AI-Powered Outfits',
  onboarding_slide3_body: 'Get instant outfit combinations generated from your own wardrobe by AI.',
  onboarding_slide4_title: 'Make It Yours',
  onboarding_slide4_body: 'Swap, add, or remove items from any generated outfit until it looks perfect.',
  onboarding_slide5_title: 'Virtual Try-On',
  onboarding_slide5_body: 'See how a complete outfit looks on you before leaving the house. Upload your photo and try it on instantly.',
  onboarding_cta_title: 'Add Your First Item',
  onboarding_cta_body: 'Start by adding one piece of clothing. We\u2019ll handle the rest.',
  onboarding_btn_next: 'Next',
  onboarding_btn_skip: 'Skip',
  onboarding_btn_add_item: 'Add Item',
  tryOnConfirmTitle: 'Try It On?',
  tryOnConfirmBody: 'See how this outfit looks on you',
  tryOnCancel: 'Cancel',
  tryOnConfirm: 'Try It On',
  tryOnStarting: 'Starting try-on...',
  tryOnGenerating: 'Generating your look...',
  tryOnStyleTip: 'Style Tip',
  tryOnFailedTitle: 'Try-on failed',
  close: 'Close',
  retry: 'Retry',
  myLooks: 'My Looks',
  myLooksSaved: 'saved',
  myLooksEmpty: 'No saved looks yet',
  myLooksEmptyHint: 'Generate a try-on look and it will appear here automatically',
  myLooksSaveLook: 'Save Look',
  justNow: 'Just now',
  minutesAgo: '{n}m ago',
  today: 'Today',
  yesterday: 'Yesterday',
  cats: {
    tops: 'Tops',
    tshirts: 'T-Shirts',
    blouses: 'Blouses',
    dresses: 'Dresses',
    jumpsuits: 'Jumpsuits',
    jackets: 'Jackets',
    skirts: 'Skirts',
    jeans: 'Jeans',
    pants: 'Pants',
    shorts: 'Shorts',
    shoes: 'Shoes',
    sneakers: 'Sneakers',
    heels: 'Heels',
    boots: 'Boots',
    sandals: 'Sandals',
    flats: 'Flats',
    bags: 'Bags',
    accessories: 'Accessories',
    shawl: 'Shawl',
    jewelry: 'Jewelry',
    underwear: 'Underwear',
  },
};

const ru: Translations = {
  today: 'Сегодня',
  weekend: 'Выходные',
  nextSevenDays: 'Ближайшие 7 дней',
  myOutfits: 'Мои образы',
  newOutfit: 'Новый образ',
  addPiecesToBuildIt: 'Добавьте вещи для образа',
  viewItems: 'Изменить',
  tryItOn: 'Примерить',
  yourStyleStartsHere: 'Здесь начинается ваш стиль.',
  tapPlusToAddFirstPiece: 'Нажмите + чтобы добавить вещь.',
  addTopAndBottom: 'Добавьте хотя бы один верх и один низ или обувь для создания образа.',
  upperBody: 'Верх',
  lowerBody: 'Низ',
  shoes: 'Обувь',
  accessories: 'Аксессуары',
  viewAll: 'Все',
  all: 'Все',
  addPhoto: 'Добавить фото',
  photoLibrary: 'Галерея',
  chooseFromYourPhotos: 'Выбрать из галереи',
  camera: 'Камера',
  takeANewPhoto: 'Сделать фото',
  addToCloset: 'Добавить в гардероб',
  category: 'Категория',
  saveToCloset: 'Сохранить',
  uploading: 'Загрузка…',
  delete: 'Удалить',
  save: 'Сохранить',
  noItemsYet: 'Пока нет вещей',
  language: 'Язык',
  upgradeToGetMore: 'Нужен план',
  addItemsFirst: 'Сначала добавьте вещи в гардероб',
  items: 'вещей',
  calendar: 'Календарь',
  choosePlan: 'Выберите тариф',
  currentPlan: 'Текущий',
  upgrade: 'Улучшить',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
  sumPerMo: 'сум/мес',
  sumPerYear: 'сум/год',
  itemsPerCat: 'вещей на категорию',
  outfitCanvases: 'досок образов',
  regens: 'генераций образов',
  tryOns: 'примерок',
  calDays: 'дней в календаре',
  reachedRegenLimit: 'Вы использовали {n} генераций. Улучшите план для большего.',
  reachedItemLimit: 'Достигнут лимит {n} вещей на категорию.',
  discoverFashion: 'Откройте моду, которую вы любите',
  phoneNumber: 'Номер телефона',
  continueBtn: 'Продолжить',
  sending: 'Отправка…',
  enterAtLeast9: 'Введите не менее 9 цифр',
  enterCodeSentTo: 'Введите код, отправленный на',
  confirmBtn: 'Подтвердить',
  changeNumber: 'Изменить номер',
  verifying: 'Проверка…',
  enterFull6Digit: 'Введите полный 6-значный код',
  onboarding_slide1_title: 'Добро пожаловать в ваш гардероб',
  onboarding_slide1_body: 'Ваш личный гардероб с искусственным интеллектом. Одевайтесь умнее и стильнее.',
  onboarding_slide2_title: 'Создайте свой гардероб',
  onboarding_slide2_body: 'Загрузите любое фото. ИИ удалит фон и воссоздаст вещь в чистом плоском стиле — готово к созданию образов.',
  onboarding_slide2_original: 'Оригинал',
  onboarding_slide2_aiflat: 'AI стиль',
  onboarding_slide3_title: 'Образы с ИИ',
  onboarding_slide3_body: 'Мгновенные комбинации образов из вашего гардероба, созданные искусственным интеллектом.',
  onboarding_slide4_title: 'Сделайте образ своим',
  onboarding_slide4_body: 'Меняйте, добавляйте или убирайте вещи из любого образа, пока он не станет идеальным.',
  onboarding_slide5_title: 'Виртуальная примерка',
  onboarding_slide5_body: 'Посмотрите, как наряд будет смотреться на вас, не выходя из дома. Загрузите фото и примерьте мгновенно.',
  onboarding_cta_title: 'Добавьте первую вещь',
  onboarding_cta_body: 'Начните с одной вещи \u2014 остальное мы возьмём на себя.',
  onboarding_btn_next: 'Далее',
  onboarding_btn_skip: 'Пропустить',
  onboarding_btn_add_item: 'Добавить вещь',
  tryOnConfirmTitle: 'Примерить?',
  tryOnConfirmBody: 'Посмотрите, как наряд смотрится на вас',
  tryOnCancel: 'Отмена',
  tryOnConfirm: 'Примерить',
  tryOnStarting: 'Запуск примерки...',
  tryOnGenerating: 'Создаём ваш образ...',
  tryOnStyleTip: 'Совет по стилю',
  tryOnFailedTitle: 'Примерка не удалась',
  close: 'Закрыть',
  retry: 'Повторить',
  myLooks: 'Мои образы',
  myLooksSaved: 'сохранено',
  myLooksEmpty: 'Нет сохранённых образов',
  myLooksEmptyHint: 'Создайте образ примерки — он появится здесь автоматически',
  myLooksSaveLook: 'Сохранить образ',
  justNow: 'Только что',
  minutesAgo: '{n} мин назад',
  today: 'Сегодня',
  yesterday: 'Вчера',
  cats: {
    tops: 'Топы',
    tshirts: 'Футболки',
    blouses: 'Блузки',
    dresses: 'Платья',
    jumpsuits: 'Комбинезоны',
    jackets: 'Куртки',
    skirts: 'Юбки',
    jeans: 'Джинсы',
    pants: 'Брюки',
    shorts: 'Шорты',
    shoes: 'Обувь',
    sneakers: 'Кроссовки',
    heels: 'Каблуки',
    boots: 'Ботинки',
    sandals: 'Сандалии',
    flats: 'Балетки',
    bags: 'Сумки',
    accessories: 'Аксессуары',
    shawl: 'Хиджаб',
    jewelry: 'Украшения',
    underwear: 'Нижнее бельё',
  },
};

const uz: Translations = {
  today: 'Bugun',
  weekend: 'Dam olish',
  nextSevenDays: 'Keyingi 7 kun',
  myOutfits: 'Obrazlarim',
  newOutfit: 'Yangi obraz',
  addPiecesToBuildIt: "Qismlar qo'shib yarating",
  viewItems: "O'zgartirish",
  tryItOn: "Kiyib ko'ring",
  yourStyleStartsHere: 'Uslubingiz shu yerdan.',
  tapPlusToAddFirstPiece: "+ bosib birinchi narsani qo'shing.",
  addTopAndBottom: "Outfit yaratish uchun kamida bitta yuqori va bitta quyi kiyim yoki oyoq kiyim qo'shing.",
  upperBody: 'Yuqori kiyim',
  lowerBody: 'Quyi kiyim',
  shoes: 'Oyoq kiyim',
  accessories: 'Aksessuarlar',
  viewAll: 'Barchasi',
  all: 'Barchasi',
  addPhoto: "Rasm qo'shish",
  photoLibrary: 'Rasm kutubxona',
  chooseFromYourPhotos: 'Rasmlaringizdan tanlang',
  camera: 'Kamera',
  takeANewPhoto: 'Yangi rasm olish',
  addToCloset: "Garderobga qo'shish",
  category: 'Kategoriya',
  saveToCloset: 'Saqlash',
  uploading: 'Yuklanmoqda…',
  delete: "O'chirish",
  save: 'Saqlash',
  noItemsYet: "Hali narsalar yo'q",
  language: 'Til',
  upgradeToGetMore: "Qo'shish uchun yangilang",
  addItemsFirst: "Avval garderobingizga kiyim qo'shing",
  items: 'ta kiyim',
  calendar: 'Kalendar',
  choosePlan: 'Rejani tanlang',
  currentPlan: 'Joriy',
  upgrade: 'Yangilash',
  monthly: 'Oylik',
  yearly: 'Yillik',
  sumPerMo: "so'm/oy",
  sumPerYear: "so'm/yil",
  itemsPerCat: 'ta kiyim/kategoriya',
  outfitCanvases: 'ta obraz taxtasi',
  regens: 'ta re-generatsiya',
  tryOns: "ta kiyib ko'rish",
  calDays: 'kun kalendarda',
  reachedRegenLimit: "{n} ta re-generatsiyadan foydalandingiz. Ko'proq uchun yangilang.",
  reachedItemLimit: 'Kategoriyada {n} ta kiyim chegarasiga yetdingiz.',
  discoverFashion: "Sevimli modangizni toping",
  phoneNumber: 'Telefon raqam',
  continueBtn: 'Davom etish',
  sending: 'Yuborilmoqda…',
  enterAtLeast9: 'Kamida 9 ta raqam kiriting',
  enterCodeSentTo: 'Yuborilgan kodni kiriting',
  confirmBtn: 'Tasdiqlash',
  changeNumber: "Raqamni o'zgartirish",
  verifying: 'Tekshirilmoqda…',
  enterFull6Digit: "6 xonali kodni to'liq kiriting",
  onboarding_slide1_title: "Garderobingizga xush kelibsiz",
  onboarding_slide1_body: "Sun'iy intellekt yordamida shaxsiy garderobingiz. Aqlliroq va chiroyliroq kiyining.",
  onboarding_slide2_title: "Garderobingizni yarating",
  onboarding_slide2_body: "Istalgan rasmni yuklang. AI fonni olib tashlaydi va kiyimni tekis uslubda qayta yaratadi \u2014 aralashtirib moslashtirish uchun tayyor.",  onboarding_slide2_original: 'Original',
  onboarding_slide2_aiflat: 'AI tekis uslub',  onboarding_slide3_title: "AI yordamida obrazlar",
  onboarding_slide3_body: "Sun'iy intellekt garderobingizdan bir zumda outfit kombinatsiyalari yaratadi.",
  onboarding_slide4_title: "Obrazingizni sozlang",
  onboarding_slide4_body: "Istalgan kiyimni almashtiring, qo'shing yoki olib tashlang \u2014 mukammal outfit yarating.",
  onboarding_slide5_title: "Virtual kiyib ko'rish",
  onboarding_slide5_body: "Uydan chiqmasdan outfit qanday ko'rinishini ko'ring. Rasmingizni yuklang va bir zumda kiyib ko'ring.",
  onboarding_cta_title: "Birinchi kiyimingizni qo'shing",
  onboarding_cta_body: "Bitta kiyimdan boshlang. Qolganini biz qilamiz.",
  onboarding_btn_next: "Keyingi",
  onboarding_btn_skip: "O'tkazib yuborish",
  onboarding_btn_add_item: "Kiyim qo'shish",
  tryOnConfirmTitle: "Kiyib ko'rish?",
  tryOnConfirmBody: "Bu outfit sizga qanday ko'rinishini ko'ring",
  tryOnCancel: 'Bekor',
  tryOnConfirm: "Kiyib ko'rish",
  tryOnStarting: "Kiyib ko'rish boshlanyapti...",
  tryOnGenerating: "Ko'rinishingiz yaratilyapti...",
  tryOnStyleTip: 'Stil maslahati',
  tryOnFailedTitle: "Kiyib ko'rish amalga oshmadi",
  close: 'Yopish',
  retry: 'Qayta urinish',
  myLooks: "Mening obrazlarim",
  myLooksSaved: 'saqlangan',
  myLooksEmpty: "Hali saqlangan ko'rinish yo'q",
  myLooksEmptyHint: "Try-on ko'rinishini yarating va u bu yerda avtomatik paydo bo'ladi",
  myLooksSaveLook: "Obrazni saqlash",
  justNow: 'Hozirgina',
  minutesAgo: '{n} daqiqa oldin',
  today: 'Bugun',
  yesterday: 'Kecha',
  cats: {
    tops: 'Tepa kiyim',
    tshirts: 'Futbolkalar',
    blouses: "Ko'ylaklar",
    dresses: 'Liboslar',
    jumpsuits: 'Kombinezonlar',
    jackets: 'Kurtkalar',
    skirts: 'Yubkalar',
    jeans: 'Jinsi',
    pants: 'Shimlar',
    shorts: 'Shortilar',
    shoes: 'Oyoq kiyim',
    sneakers: 'Krossovkalar',
    heels: 'Poshnali tufli',
    boots: 'Etiklar',
    sandals: 'Sandallar',
    flats: 'Balet tufli',
    bags: 'Sumkalar',
    accessories: 'Aksessuarlar',
    shawl: "Ro'mol",
    jewelry: 'Zargarlik',
    underwear: 'Ichki kiyim',
  },
};

export const translations: Record<Locale, Translations> = { en, ru, uz };
