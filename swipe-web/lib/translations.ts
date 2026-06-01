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
  moreAvailable: string;
  saveFailed: string;
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
  tryOnTips: string[];
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
  yesterday: string;
  promoBannerTitle: string;
  promoBannerBody: string;
  promoBannerCta: string;
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
  moreAvailable: 'more available',
  saveFailed: 'Failed to save outfit. Please try again.',
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
  tryOnTips: [
    "The 'capsule wardrobe' concept: just 33 versatile pieces can create over 100 distinct outfits.",
    "Fit is everything — a well-tailored outfit in simple fabrics always looks more polished than a badly fitted designer piece.",
    "Neutral colors like white, black, navy, and beige pair effortlessly with almost anything in your wardrobe.",
    "The rule of three: limit an outfit to three colors or patterns for a naturally balanced, intentional look.",
    "Layering adds depth and dimension — a light jacket or cardigan over a basic tee can elevate the whole look.",
    "Clothes that fit your shoulders perfectly are the key — shoulders are the hardest thing to alter.",
    "A monochrome outfit (one color head-to-toe) creates a sleek, elongating silhouette.",
    "Tucking in your shirt — even just at the front — instantly gives any outfit a more intentional, styled feel.",
    "Proportion matters: pair oversized tops with fitted bottoms, and wide-leg trousers with a slim top.",
    "Accessories can shift the same outfit between casual, smart, and formal — it's the fastest way to restyle.",
    "Dark denim is more formal than light wash — swapping shades can dress an outfit up or down easily.",
    "Pattern mixing works best when one pattern is large-scale and the other is smaller, with a shared color.",
    "White sneakers are the most versatile shoe ever made — they pair with everything from suits to sundresses.",
    "Wearing the darkest shade at the bottom grounds your silhouette and makes you look taller.",
    "A belt in the same color as your shoes creates a polished, pulled-together look without much effort.",
    "Natural fabrics like cotton, linen, and wool breathe better and tend to age more gracefully than synthetics.",
    "Rolling up your sleeves adds a relaxed, approachable energy to any smart or semi-formal outfit.",
    "Think 'cost per wear' — a $150 jacket worn 150 times costs $1 per wear, making it a better value than cheap items worn twice.",
    "Color blocking (two bold solid colors together) looks most striking when the colors are complementary or opposite on the color wheel.",
    "Building your wardrobe around 5 core colors you love means every piece you own will mix and match effortlessly.",
  ],
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
  yesterday: 'Yesterday',
  promoBannerTitle: 'Limited offer: 1+1 deal!',
  promoBannerBody: 'Buy 1 month of Libas AI Wardrobe subscription and get another month completely free. Limited offer!',
  promoBannerCta: 'Get offer',
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
  moreAvailable: 'ещё доступно',
  saveFailed: 'Не удалось сохранить образ. Попробуйте снова.',
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
  tryOnTips: [
    'Концепция «капсульного гардероба»: всего 33 вещи могут создать более 100 разных образов.',
    'Посадка — это всё: хорошо скроенный наряд из простых тканей всегда выглядит лучше, чем дорогая вещь не по размеру.',
    'Нейтральные цвета — белый, чёрный, тёмно-синий и бежевый — сочетаются почти с любой вещью в гардеробе.',
    'Правило трёх: ограничьте образ тремя цветами или узорами для естественного, сбалансированного лука.',
    'Многослойность добавляет глубину: лёгкая куртка или кардиган поверх базовой футболки поднимет весь образ.',
    'Главное, чтобы одежда идеально сидела в плечах — это самое сложное для переделки.',
    'Монохромный образ (один цвет с головы до ног) создаёт стройный, вытягивающий силуэт.',
    'Заправьте рубашку — хотя бы спереди — и любой образ сразу приобретёт более стильный вид.',
    'Пропорции важны: оверсайз-топ носите с облегающим низом, а широкие брюки — с узким верхом.',
    'Аксессуары могут перевести один и тот же наряд из повседневного в деловой и выходной — быстрее не переодеться.',
    'Тёмный деним формальнее светлого: смена оттенка легко переведёт образ с кэжуал на смарт.',
    'Сочетание принтов лучше всего работает, когда один крупный, а другой мелкий, но с общим цветом.',
    'Белые кеды — самая универсальная обувь: они сочетаются со всем — от костюма до сарафана.',
    'Самый тёмный оттенок снизу заземляет силуэт и визуально делает вас выше.',
    'Ремень в цвет туфель создаёт завершённый образ без лишних усилий.',
    'Натуральные ткани — хлопок, лён, шерсть — лучше дышат и дольше сохраняют вид по сравнению с синтетикой.',
    'Закатанные рукава добавляют непринуждённость любому деловому или полуформальному наряду.',
    'Думайте о «стоимости за носку»: куртка за $150, надетая 150 раз, обходится в $1 за носку — это выгоднее, чем дешёвые вещи.',
    'Колор-блокинг смотрится ярче всего, когда цвета комплементарны или противоположны на цветовом круге.',
    'Гардероб вокруг 5 любимых базовых цветов означает, что каждая вещь будет сочетаться с любой другой.',
  ],
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
  yesterday: 'Вчера',
  promoBannerTitle: 'Только сейчас: акция 1+1!',
  promoBannerBody: 'Оформите подписку Libas AI Гардероб на 1 месяц и получите ещё 1 месяц совершенно бесплатно. Предложение ограничено!',
  promoBannerCta: 'Получить',
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
  moreAvailable: 'ta joy mavjud',
  saveFailed: "Obrazni saqlashda xatolik. Qaytadan urinib ko'ring.",
  addItemsFirst: "Avval garderobingizga kiyim qo'shing",
  items: 'ta kiyim',
  calendar: 'Kalendar',
  choosePlan: 'Rejani tanlang',
  currentPlan: 'Joriy',
  upgrade: 'Faollashtirish',
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
  tryOnTips: [
    "'Kapsul garderobi' kontseptsiyasi: atigi 33 ta universal kiyim 100 dan ortiq ko'rinish yaratishi mumkin.",
    "Kiyimning o'tirganligi — bu hammasi: oddiy matolardan tikilgan yaxshi bichimlangan kiyim dizayner buyumidan har doim yaxshiroq ko'rinadi.",
    "Oq, qora, to'q koʼk va bej kabi neytral ranglar garderobingizdagi deyarli barcha narsaga uyg'un keladi.",
    "Uchlik qoidasi: muvozanatli ko'rinish uchun kiyimni uch rang yoki naqshdan oshirmang.",
    "Ko'p qatlamlilik chuqurlik qo'shadi — oddiy futbolka ustiga yengil kurtka butun ko'rinishni ko'taradi.",
    "Yelkalariga to'g'ri o'tiradigan kiyim asosiy — yelkalar eng qiyin o'zgartirib bo'ladigani.",
    "Monoxrom ko'rinish (boshdan oyoqqa bir rang) nafis va uzaytiruvchi siluet yaratadi.",
    "Ko'ylagingizni ichkariga suqib qo'ying — hatto faqat oldidan — bu har qanday kiyimga ko'proq uslubli ko'rinish beradi.",
    "Proporsiya muhim: keng bluzka bilan fitli pastlik, keng shimlar bilan ingichka ustki kiyim kiyingin.",
    "Aksessuarlar bir xil kiyimni kundalik va rasmiy ko'rinishga o'zgartirishi mumkin — bu eng tez uslub usuli.",
    "To'q denim och yuvishdan ko'ra resmiyroq — soya almashish kiyimni osongina o'zgartiradi.",
    "Naqsh aralashtiruv eng yaxshi ishlaydi: biri yirik, ikkinchisi kichik, umumiy rang bo'lsa.",
    "Oq krossovkalar — eng universal oyoq kiyim: ular kostyumdan sarafangacha hamma narsa bilan mos keladi.",
    "Pastda eng to'q soya siluetni 'yerga ulaydi' va sizni balandroq ko'rsatadi.",
    "Tuflari bilan bir xil rangli kamar katta kuch sarflamasdan tartibli ko'rinish yaratadi.",
    "Paxta, zig'ir va jun kabi tabiiy matolar yaxshiroq nafas oladi va uzoqroq eskirmasdan turadi.",
    "Yenglarni shimlab qo'yish har qanday rasmiy kiyimga bo'shashgan, samimiy energiya qo'shadi.",
    "'Kiyish narxi' haqida o'ylang: 150 dollar turadigan va 150 marta kiyiladigan kurtka har bir kiyishga 1 dollarga tushadi.",
    "Rang bloklash (ikkita to'yingan bir rang) rang doirasida to'ldiruvchi yoki qarama-qarshi ranglar bo'lganda eng chiroyli ko'rinadi.",
    "Garderobingizni sevgan 5 ta asosiy rang atrofida quring — va har bir buyum boshqasiga mukammal mos keladi.",
  ],
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
  yesterday: 'Kecha',
  promoBannerTitle: 'Faqat hozir: 1+1 aksiya!',
  promoBannerBody: 'Libas AI Garderob obunasini 1 oyga oling va yana 1 oy mutlaqo bepul foydalaning. Taklif cheklangan!',
  promoBannerCta: 'Taklifni olish',
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
