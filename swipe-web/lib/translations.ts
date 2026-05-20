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
