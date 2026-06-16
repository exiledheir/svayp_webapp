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
  tapRegeneratePrompt: string;
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
  addCategory: string;
  saveToCloset: string;
  uploading: string;
  stepChecking: string;
  stepGenerating: string;
  stepRemovingBg: string;
  stepAnalyzing: string;
  stepAlmostDone: string;
  stepProcessing: string;
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
  mostPopular: string;
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
  reachedCanvasLimit: string;
  reachedTryOnLimit: string;
  reachedItemLimit: string;
  categoryFullError: string;
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
  resendCode: string;
  resendCodeIn: string;
  enterPhoneNumber: string;
  browseAsGuest: string;
  phoneVerificationSubtitle: string;
  verifyPhoneNumber: string;
  tellUsAboutYourself: string;
  personalizeExperience: string;
  fullName: string;
  enterYourName: string;
  dateOfBirth: string;
  day: string;
  month: string;
  year: string;
  invalidDateError: string;
  gender: string;
  genderFemale: string;
  genderMale: string;
  signInTitle: string;
  signInSubtitle: string;
  continueWithTelegram: string;
  orSeparator: string;
  telegramVerifying: string;
  telegramAuthError: string;
  verifyMethodTitle: string;
  verifyMethodSubtitle: string;
  verifyWithSms: string;
  back: string;
  partnerPortal: string;
  partnerWelcomeBack: string;
  partnerSignInSubtitle: string;
  partnerUsernameLabel: string;
  partnerUsernameHint: string;
  partnerPasswordLabel: string;
  partnerPasswordHint: string;
  partnerSignIn: string;
  partnerNeedAccess: string;
  partnerLoginFailed: string;
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
  tryOnPhase2: string;
  tryOnPhase3: string;
  tryOnPhase4: string;
  tryOnTimeEstimate: string;
  tryOnStyleTip: string;
  tryOnProTip: string;
  tryOnDidYouKnow: string;
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
  promoBannerTimerLabel: string;
  promoBannerNote: string;
  // ── Coach marks ────────────────────────────────────────────────
  coachAddTitle: string;
  coachAddBody: string;
  coachGenerateTitle: string;
  coachGenerateBody: string;
  coachEditTitle: string;
  coachEditBody: string;
  coachTryOnTitle: string;
  coachTryOnBody: string;
  coachGotIt: string;
  // ── Enhanced empty states ───────────────────────────────────────
  emptyStep1: string;
  emptyStep2: string;
  emptyStep3: string;
  emptyAddTap: string;
  generateHint: string;
  noItemsInSection: string;
  tapPlusToAdd: string;
  addUpperFirst: string;
  addLowerOrShoes: string;
  saveNeedsTopItem: string;
  // ── Canvas hints ────────────────────────────────────────────────
  canvasEmptyHint: string;
  canvasHintDrag: string;
  canvasHintPinch: string;
  canvasHintSwap: string;
  profile: string;
  replayTour: string;
  logout: string;
  theme: string;
  themeLight: string;
  themeDark: string;
  dayNames: [string, string, string, string, string, string, string];
  monthNames: [string, string, string, string, string, string, string, string, string, string, string, string];
  demoAddTitle: string;
  demoAddBody: string;
  tooFewItemsTitle: string;
  tooFewItemsBody: string;
  outfitsExhaustedTitle: string;
  outfitsExhaustedBody: string;
  addClothingBtn: string;
  readyLabel: string;
  moreNeeded: string;
  regenerateWithAI: string;
  aiThinking: string;
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
  tapRegeneratePrompt: 'Tap ↻ to generate your first outfit',
  addTopAndBottom: 'Add a top + bottom (pants, skirt) or a dress to generate outfits.',
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
  addCategory: 'Add category',
  saveToCloset: 'Save to Closet',
  uploading: 'Uploading…',
  stepChecking: 'Checking image…',
  stepGenerating: 'Generating product image… (~1 min)',
  stepRemovingBg: 'Removing background…',
  stepAnalyzing: 'Analyzing style…',
  stepAlmostDone: 'Almost done…',
  stepProcessing: 'Processing…',
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
  mostPopular: 'Most popular',
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
  reachedCanvasLimit: 'This outfit board is locked. Your current plan includes {n} board(s). Upgrade to unlock all your boards.',
  reachedTryOnLimit: "You've used all {n} try-ons. Upgrade to try on more outfits.",
  reachedItemLimit: 'You\'ve reached the {n} items/category limit.',
  categoryFullError: 'This category is full ({n}/{n}). Try another category or upgrade for more slots.',

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
  resendCode: 'Resend code',
  resendCodeIn: 'Resend in {n}s',
  enterPhoneNumber: 'Enter your phone number',
  browseAsGuest: 'Browse as guest',
  phoneVerificationSubtitle: 'We will send you a verification code to confirm your number',
  verifyPhoneNumber: 'Verify your number',
  tellUsAboutYourself: 'Tell us about yourself',
  personalizeExperience: 'Help us personalise your experience',
  fullName: 'Full name',
  enterYourName: 'Enter your name',
  dateOfBirth: 'Date of birth',
  day: 'DD',
  month: 'MM',
  year: 'YYYY',
  invalidDateError: 'Please enter a valid date',
  gender: 'Gender',
  genderFemale: 'Female',
  genderMale: 'Male',
  signInTitle: 'Sign in to LIBΛS',
  signInSubtitle: 'Sign in or create your account',
  continueWithTelegram: 'Continue with Telegram',
  orSeparator: 'or',
  telegramVerifying: 'Signing in with Telegram…',
  telegramAuthError: 'Telegram sign-in failed. Please try again.',
  verifyMethodTitle: 'Verify your identity',
  verifyMethodSubtitle: 'Choose how to verify your number',
  verifyWithSms: 'Use SMS instead',
  back: 'Back',
  partnerPortal: 'Partner Portal',
  partnerWelcomeBack: 'Welcome back',
  partnerSignInSubtitle: 'Sign in to your partner account',
  partnerUsernameLabel: 'Username or email',
  partnerUsernameHint: 'Enter your username',
  partnerPasswordLabel: 'Password',
  partnerPasswordHint: 'Enter your password',
  partnerSignIn: 'Sign in',
  partnerNeedAccess: 'Need access? Contact your manager.',
  partnerLoginFailed: 'Login failed. Check your credentials.',
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
  tryOnPhase2: 'Analyzing your outfit...',
  tryOnPhase3: 'Rendering your look...',
  tryOnPhase4: 'Adding finishing touches...',
  tryOnTimeEstimate: 'Usually takes 30–60 seconds',
  tryOnStyleTip: 'Style Tip',
  tryOnProTip: 'Pro Tip',
  tryOnDidYouKnow: 'Did you know?',
  tryOnTips: [
    'Your wardrobe may be hiding dozens of outfits you have never tried.',
    'You do not always need to buy something new to look new.',
    'The best outfits are often built around one key piece.',
    'Core colors: white, black, grey, beige, and navy.',
    'Most people regularly wear only 20% of their wardrobe.',
    'Good style is balance, not quantity.',
    'Contrasting colors attract more attention.',
    'Fashion changes, but good taste stays relevant.',
    'Beige and white is one of the most expensive-looking combinations.',
    'The simpler the outfit, the more important the details.',
    'Many luxury brands rely on minimalism.',
    'A capsule wardrobe helps you buy less and wear more.',
    'The right bag completes an outfit.',
    'Sometimes the best outfit is already in your closet.',
    'AI Wardrobe helps you see familiar clothes in a new way.',
    'Good style saves both time and money.',
    'Every new outfit is a new way to express yourself.',
    'Fit matters more than the brand.',
    'Accessories can change the mood of an entire look.',
    'A monochrome look always feels intentional and polished.',
    'Layering is the easiest way to create more outfits from fewer pieces.',
    'The color you wear near your face affects how you look.',
    'Quality over quantity — always.',
    'Rolling up your sleeves instantly makes any outfit feel more relaxed.',
    'A well-ironed shirt can elevate even the simplest outfit.',
    'Dark colors are slimming; light colors add volume.',
    'Shoes set the tone for the entire outfit.',
    'Tucking in your shirt gives structure to a loose look.',
    'Pattern mixing works when one is large and the other small.',
    'White sneakers go with almost everything.',
    'A belt can transform the silhouette of any outfit.',
    'Structured bags look more formal; soft bags look more casual.',
    'Vertical stripes visually elongate the body.',
    'Matching your bag to your shoes looks classic and refined.',
    'Cold tones suit cool skin; warm tones suit warm skin.',
    'Less is more — especially with accessories.',
    'Classic pieces never go out of style.',
    'The right underwear makes every outfit fit better.',
    'A scarf is one of the most versatile accessories you can own.',
    'Denim always works — it is the universal fabric.',
    'Prints are best kept to one piece per outfit.',
    'An outfit that fits perfectly is always in style.',
    'Confidence is the best accessory you can wear.',
    'Invest in a great coat — you wear it over everything.',
    'Blazers make almost any outfit look more put-together.',
    'Knowing your body shape helps you dress smarter.',
    'Seasonal color palettes keep your wardrobe feeling fresh.',
    'Good lighting can make any outfit look amazing.',
    'Style is a way of saying who you are without speaking.',
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
  promoBannerTitle: '20% off Pro & Premium 🔥',
  promoBannerBody: 'Subscribe today and unlock all AI stylist features.',
  promoBannerCta: 'Subscribe',
  promoBannerTimerLabel: 'Offer expires in',
  promoBannerNote: 'Offer valid for a limited time only.',
  // ── Coach marks ────────────────────────────────────────────────
  coachAddTitle: 'Add your clothes',
  coachAddBody: 'Tap + to upload a photo of any clothing item. AI removes the background automatically.',
  coachGenerateTitle: 'Generate an outfit',
  coachGenerateBody: 'Tap the ✦ star button and AI will mix your clothes into a ready-to-wear outfit.',
  coachEditTitle: 'Edit your outfit',
  coachEditBody: 'Drag items to move, pinch to resize, tap an item then Swap to change it.',
  coachTryOnTitle: 'See it on you',
  coachTryOnBody: 'Virtually try on any outfit with AI — upload your photo and see the result instantly.',
  coachGotIt: 'Got it →',
  // ── Enhanced empty states ───────────────────────────────────────
  emptyStep1: 'Add a top',
  emptyStep2: 'Add a bottom',
  emptyStep3: 'Generate outfit',
  emptyAddTap: 'Tap to add',
  generateHint: "We'll mix your items into a complete outfit",
  noItemsInSection: 'No items yet',
  tapPlusToAdd: 'Tap + to add your first piece',
  addUpperFirst: 'Add a top to get started',
  addLowerOrShoes: 'Now add lower body or shoes',
  saveNeedsTopItem: 'Please add at least one top item to save your outfit.',
  // ── Canvas hints ────────────────────────────────────────────────
  canvasEmptyHint: 'Tap + to add your first item',
  canvasHintDrag: 'Drag to move',
  canvasHintPinch: 'Pinch to resize',
  canvasHintSwap: 'Tap item → Swap',
  profile: 'Profile',
  replayTour: 'Replay app tour',
  logout: 'Log out',
  theme: 'Theme',
  themeLight: 'light',
  themeDark: 'dark',
  dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  demoAddTitle: 'Add your clothes',
  demoAddBody: 'Upload a photo of your clothes to generate outfits and try them on!',
  tooFewItemsTitle: 'Not enough variety',
  tooFewItemsBody: 'Add more clothing items so AI can create diverse outfits for you!',
  outfitsExhaustedTitle: 'Generating outfits',
  outfitsExhaustedBody: 'AI is finding new combinations. Tap ✦ again in 30–60 seconds.',
  addClothingBtn: 'Add clothing',
  readyLabel: '✓ Ready!',
  moreNeeded: '{n} more needed',
  regenerateWithAI: 'Regenerate with AI',
  aiThinking: 'AI is thinking…',

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
  tapRegeneratePrompt: 'Нажмите ↻ чтобы сгенерировать образ',
  addTopAndBottom: 'Добавьте верх + низ (брюки, юбку) или платье, чтобы ИИ создал образы.',
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
  addCategory: 'Выберите категорию',
  saveToCloset: 'Сохранить',
  uploading: 'Загрузка…',
  stepChecking: 'Проверка изображения…',
  stepGenerating: 'Генерация изображения… (~1 мин)',
  stepRemovingBg: 'Удаление фона…',
  stepAnalyzing: 'Анализ стиля…',
  stepAlmostDone: 'Почти готово…',
  stepProcessing: 'Обработка…',
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
  mostPopular: 'Популярный',
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
  reachedCanvasLimit: 'Эта доска нарядов заблокирована. Ваш текущий план включает {n} досок(у). Обновите план, чтобы разблокировать все.',
  reachedTryOnLimit: 'Вы использовали все {n} примерок. Улучшите план, чтобы примерять больше образов.',
  reachedItemLimit: 'Достигнут лимит {n} вещей на категорию.',
  categoryFullError: 'Эта категория заполнена ({n}/{n}). Добавьте в другую или улучшите план.',

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
  resendCode: 'Отправить снова',
  resendCodeIn: 'Повторная отправка через {n}с',
  enterPhoneNumber: 'Введите номер телефона',
  browseAsGuest: 'Войти как гость',
  phoneVerificationSubtitle: 'Мы отправим вам код подтверждения для подтверждения номера',
  verifyPhoneNumber: 'Подтвердите номер',
  tellUsAboutYourself: 'Расскажите о себе',
  personalizeExperience: 'Помогите нам персонализировать ваш опыт',
  fullName: 'Полное имя',
  enterYourName: 'Введите ваше имя',
  dateOfBirth: 'Дата рождения',
  day: 'ДД',
  month: 'ММ',
  year: 'ГГГГ',
  invalidDateError: 'Введите корректную дату',
  gender: 'Пол',
  genderFemale: 'Женский',
  genderMale: 'Мужской',
  signInTitle: 'Вход в LIBLΛS',
  signInSubtitle: 'Войдите или создайте аккаунт',
  continueWithTelegram: 'Продолжить через Telegram',
  orSeparator: 'или',
  telegramVerifying: 'Вход через Telegram…',
  telegramAuthError: 'Ошибка входа через Telegram. Попробуйте ещё раз.',
  verifyMethodTitle: 'Подтвердите личность',
  verifyMethodSubtitle: 'Выберите способ подтверждения',
  verifyWithSms: 'Подтвердить через SMS',
  back: 'Назад',
  partnerPortal: 'Партнёрский портал',
  partnerWelcomeBack: 'С возвращением',
  partnerSignInSubtitle: 'Войдите в свой партнёрский аккаунт',
  partnerUsernameLabel: 'Имя пользователя или email',
  partnerUsernameHint: 'Введите имя пользователя',
  partnerPasswordLabel: 'Пароль',
  partnerPasswordHint: 'Введите пароль',
  partnerSignIn: 'Войти',
  partnerNeedAccess: 'Нужен доступ? Обратитесь к менеджеру.',
  partnerLoginFailed: 'Ошибка входа. Проверьте данные.',
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
  tryOnPhase2: 'Анализируем ваш наряд...',
  tryOnPhase3: 'Рендерим ваш образ...',
  tryOnPhase4: 'Добавляем финальные штрихи...',
  tryOnTimeEstimate: 'Обычно занимает 30–60 секунд',
  tryOnStyleTip: 'Совет по стилю',
  tryOnProTip: 'Профи-совет',
  tryOnDidYouKnow: 'Знали ли вы?',
  tryOnTips: [
    'В вашем гардеробе могут скрываться десятки образов, которые вы ещё не пробовали.',
    'Необязательно покупать новое, чтобы выглядеть по-новому.',
    'Самые удачные образы часто строятся вокруг одной вещи.',
    'Базовые цвета: белый, чёрный, серый, бежевый и тёмно-синий.',
    'Большинство людей регулярно носят только 20% своего гардероба.',
    'Хороший стиль — это баланс, а не количество вещей.',
    'Контрастные цвета привлекают больше внимания.',
    'Мода меняется, а хороший вкус остаётся актуальным всегда.',
    'Бежевый и белый — одно из самых дорогих на вид сочетаний.',
    'Чем проще образ, тем важнее качество деталей.',
    'Многие люксовые бренды делают ставку на минимализм.',
    'Капсульный гардероб помогает покупать меньше и носить больше.',
    'Правильно подобранная сумка завершает образ.',
    'Иногда лучший образ уже есть в вашем шкафу.',
    'AI Garderob помогает увидеть привычные вещи по-новому.',
    'Хороший стиль экономит деньги и время.',
    'Каждый новый образ — это новый способ выразить себя.',
    'Посадка важнее бренда.',
    'Аксессуары могут изменить настроение всего образа.',
    'Монохромный образ всегда выглядит осознанным и стильным.',
    'Многослойность — самый простой способ создать больше образов из меньшего числа вещей.',
    'Цвет одежды у лица влияет на то, как вы выглядите.',
    'Качество важнее количества — всегда.',
    'Закатанные рукава мгновенно делают любой образ более непринуждённым.',
    'Хорошо выглаженная рубашка поднимает даже самый простой образ.',
    'Тёмные цвета стройнят, светлые — добавляют объём.',
    'Обувь задаёт тон всему образу.',
    'Заправленная рубашка придаёт структуру свободному образу.',
    'Сочетание принтов работает, когда один крупный, а другой мелкий.',
    'Белые кеды подходят почти ко всему.',
    'Ремень может преобразить силуэт любого образа.',
    'Жёсткие сумки выглядят формальнее, мягкие — повседневнее.',
    'Вертикальные полосы визуально вытягивают фигуру.',
    'Сумка в цвет туфель — классика и элегантность.',
    'Холодные тона идут людям с холодным цветотипом, тёплые — с тёплым.',
    'Меньше — значит больше, особенно с аксессуарами.',
    'Классические вещи никогда не выходят из моды.',
    'Правильное бельё улучшает посадку любой одежды.',
    'Шарф — один из самых универсальных аксессуаров.',
    'Деним всегда работает — это универсальная ткань.',
    'Лучше один принт на весь образ.',
    'Хорошо сидящий образ всегда в моде.',
    'Уверенность — лучший аксессуар.',
    'Вложитесь в хорошее пальто — вы носите его поверх всего.',
    'Пиджак делает почти любой образ более собранным.',
    'Знание своего типа фигуры помогает одеваться умнее.',
    'Сезонные цветовые палитры освежают гардероб.',
    'Хорошее освещение делает любой образ прекрасным.',
    'Стиль — это способ рассказать о себе без слов.',
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
  promoBannerTitle: 'Скидка 20% на Pro и Premium 🔥',
  promoBannerBody: 'Подпишитесь сегодня и откройте все возможности AI-стилиста.',
  promoBannerCta: 'Подписаться',
  promoBannerTimerLabel: 'Предложение истекает через',
  promoBannerNote: 'Акция действует ограниченное время.',
  // ── Coach marks ────────────────────────────────────────────────
  coachAddTitle: 'Добавьте одежду',
  coachAddBody: 'Нажмите + чтобы загрузить фото любой вещи. AI удалит фон автоматически.',
  coachGenerateTitle: 'Создайте образ',
  coachGenerateBody: 'Нажмите ✦ — AI смешает ваши вещи в готовый образ.',
  coachEditTitle: 'Отредактируйте образ',
  coachEditBody: 'Перетащите вещи для перемещения, сведите пальцы для изменения размера, нажмите на вещь → «Замена».',
  coachTryOnTitle: 'Примерьте на себя',
  coachTryOnBody: 'Виртуально примерьте любой образ с AI — загрузите фото и сразу увидите результат.',
  coachGotIt: 'Понятно →',
  // ── Enhanced empty states ───────────────────────────────────────
  emptyStep1: 'Добавить верх',
  emptyStep2: 'Добавить низ',
  emptyStep3: 'Создать образ',
  emptyAddTap: 'Нажмите, чтобы добавить',
  generateHint: 'Мы смешаем ваши вещи в готовый образ',
  noItemsInSection: 'Пока нет вещей',
  tapPlusToAdd: 'Нажмите + чтобы добавить первую вещь',
  addUpperFirst: 'Добавьте верхнюю часть гардероба',
  addLowerOrShoes: 'Добавьте низ или обувь',
  saveNeedsTopItem: 'Пожалуйста, добавьте хотя бы один верх, чтобы сохранить образ.',
  // ── Canvas hints ────────────────────────────────────────────────
  canvasEmptyHint: 'Нажмите + чтобы добавить первую вещь',
  canvasHintDrag: 'Перетащите',
  canvasHintPinch: 'Сведите пальцы для масштаба',
  canvasHintSwap: 'Нажмите → Замена',
  profile: 'Профиль',
  replayTour: 'Повторить обучение',
  logout: 'Выйти',
  theme: 'Тема',
  themeLight: 'светлая',
  themeDark: 'тёмная',
  dayNames: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  monthNames: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  demoAddTitle: 'Добавьте свою одежду',
  demoAddBody: 'Загрузите фото своих вещей, чтобы создавать образы и примерять их!',
  tooFewItemsTitle: 'Мало одежды для новых образов',
  tooFewItemsBody: 'Добавьте больше вещей, чтобы ИИ создал разнообразные образы!',
  outfitsExhaustedTitle: 'Генерируем образы',
  outfitsExhaustedBody: 'ИИ подбирает новые образы. Нажмите ✦ через 30–60 секунд.',
  addClothingBtn: 'Добавить одежду',
  readyLabel: '✓ Готово!',
  moreNeeded: 'ещё {n}',
  regenerateWithAI: 'Обновить с AI',
  aiThinking: 'AI думает…',

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
  tapPlusToAddFirstPiece: "+  bosib birinchi narsani qo'shing.",
  tapRegeneratePrompt: 'Obrazingizni yaratish uchun ↻ bosing',
  addTopAndBottom: "Outfit yaratish uchun kamida bitta yuqori va bitta pastki kiyim yoki oyoq kiyim qo'shing.",
  upperBody: 'Yuqori kiyim',
  lowerBody: 'Pastki kiyim',
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
  addCategory: "Kategoriyani tanlang",
  saveToCloset: 'Saqlash',
  uploading: 'Yuklanmoqda…',
  stepChecking: 'Rasm tekshirilmoqda…',
  stepGenerating: 'Mahsulot rasmi yaratilmoqda… (~1 daqiqa)',
  stepRemovingBg: 'Fon o\'chirilmoqda…',
  stepAnalyzing: 'Uslub tahlil qilinmoqda…',
  stepAlmostDone: 'Deyarli tayyor…',
  stepProcessing: 'Ishlov berilmoqda…',
  delete: "O'chirish",
  save: 'Saqlash',
  noItemsYet: "Hali narsalar yo'q",
  language: 'Til',
  upgradeToGetMore: "Ko'rish uchun yangilang",
  moreAvailable: 'ta joy mavjud',
  saveFailed: "Obrazni saqlashda xatolik. Qaytadan urinib ko'ring.",
  addItemsFirst: "Avval garderobingizga kiyim qo'shing",
  items: 'ta kiyim',
  calendar: 'Kalendar',
  choosePlan: 'Rejani tanlang',
  currentPlan: 'Joriy',
  mostPopular: "Ko'pchilik tanlovi",
  upgrade: 'Faollashtirish',
  monthly: 'Oylik',
  yearly: 'Yillik',
  sumPerMo: "so'm/oy",
  sumPerYear: "so'm/yil",
  itemsPerCat: 'ta kiyim/kategoriya',
  outfitCanvases: 'ta Obrazlar doskasi',
  regens: 'ta re-generatsiya',
  tryOns: "ta kiyib ko'rish",
  calDays: 'kun kalendarda',
  reachedRegenLimit: "Siz {n} ta outfit generatsiyasidan foydalandingiz. Ko'proq uchun obunangizni yangilang.",
  reachedCanvasLimit: "Bu obrazlar doskasi qulflangan. Joriy rejangizda {n} ta doska mavjud. Barchasini ochish uchun obunangizni yangilang.",
  reachedTryOnLimit: "{n} ta kiyib ko'rishdan foydalandingiz. Ko'proq uchun rejani yangilang.",
  reachedItemLimit: 'Kategoriyada {n} ta kiyim chegarasiga yetdingiz.',
  categoryFullError: "Bu kategoriya to'lgan ({n}/{n}). Boshqasiga qo'shing yoki rejani yangilang.",

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
  resendCode: 'Kodni qayta yuborish',
  resendCodeIn: '{n}s ichida qayta yuborish',
  enterPhoneNumber: 'Telefon raqamingizni kiriting',
  browseAsGuest: 'Mehmon sifatida kirish',
  phoneVerificationSubtitle: 'Raqamingizni tasdiqlash uchun sizga tasdiqlash kodini yuboramiz',
  verifyPhoneNumber: 'Raqamingizni tasdiqlang',
  tellUsAboutYourself: "O'zingiz haqingizda ayting",
  personalizeExperience: "Tajribangizni shaxsiylashtirish uchun yordam bering",
  fullName: 'To\'liq ism',
  enterYourName: 'Ismingizni kiriting',
  dateOfBirth: "Tug'ilgan sana",
  day: 'KK',
  month: 'OO',
  year: 'YYYY',
  invalidDateError: "To'g'ri sanani kiriting",
  gender: 'Jins',
  genderFemale: 'Ayol',
  genderMale: 'Erkak',
  signInTitle: 'LIBLΛS ga kirish',
  signInSubtitle: 'Hisobingizga kiring yoki roʻxatdan oʻing',
  continueWithTelegram: 'Telegram orqali davom etish',
  orSeparator: 'yoki',
  telegramVerifying: 'Telegram orqali kirilmoqda…',
  telegramAuthError: 'Telegram orqali kirish muvaffaqiyatsiz. Qayta urinib koʻing.',
  verifyMethodTitle: 'Shaxsingizni tasdiqlang',
  verifyMethodSubtitle: 'Tasdiqlash usulini tanlang',
  verifyWithSms: 'SMS orqali tasdiqlash',
  back: 'Orqaga',
  partnerPortal: 'Hamkor portali',
  partnerWelcomeBack: 'Xush kelibsiz',
  partnerSignInSubtitle: 'Hamkor hisobingizga kiring',
  partnerUsernameLabel: 'Foydalanuvchi nomi yoki email',
  partnerUsernameHint: 'Foydalanuvchi nomini kiriting',
  partnerPasswordLabel: 'Parol',
  partnerPasswordHint: 'Parolni kiriting',
  partnerSignIn: 'Kirish',
  partnerNeedAccess: 'Kirish kerakmi? Menejgeringizga murojaat qiling.',
  partnerLoginFailed: 'Kirish muvaffaqiyatsiz. Ma\'lumotlarni tekshiring.',
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
  tryOnPhase2: "Outfitingiz tahlil qilinyapti...",
  tryOnPhase3: "Ko'rinishingiz renderlanmoqda...",
  tryOnPhase4: "Yakuniy bezaklar qo'shilmoqda...",
  tryOnTimeEstimate: 'Odatda 30–60 soniya davom etadi',
  tryOnStyleTip: 'Stil maslahati',
  tryOnProTip: 'Pro maslahat',
  tryOnDidYouKnow: 'Bilasizmi?',
  tryOnTips: [
    "Garderobingizda hali foydalanilmagan o'nlab obrazlar yashiringan bo'lishi mumkin.",
    "Yangicha ko'rinish uchun har doim yangi kiyim sotib olish shart emas.",
    "Eng yaxshi obrazlar ko'pincha bitta asosiy kiyim atrofida quriladi.",
    "Bazaviy ranglar: oq, qora, kulrang, bej va to'q ko'k.",
    "Odamlarning aksariyati garderobining faqat 20 foizini muntazam kiyadi.",
    "Yaxshi uslub ko'p kiyim emas, muvozanatdir.",
    "Kontrast ranglar ko'proq e'tibor tortadi.",
    "Moda o'zgaradi, yaxshi did esa doimo dolzarb.",
    "Bej va oq eng qimmat ko'rinadigan uyg'unliklardan biridir.",
    "Obraz qanchalik sodda bo'lsa, detallar sifati shunchalik muhim.",
    "Ko'plab premium brendlar minimalizmga tayanadi.",
    "Kapsula garderob kamroq xarid qilib, ko'proq foydalanishga yordam beradi.",
    "To'g'ri tanlangan sumka obrazni yakunlaydi.",
    "Ba'zida eng yaxshi obraz allaqachon garderobingizda bo'ladi.",
    "AI Garderob odatiy kiyimlarga yangicha nazar bilan qarashga yordam beradi.",
    "Yaxshi uslub vaqt va pulni tejaydi.",
    "Har bir yangi obraz o'zingizni ifoda etishning yangi usulidir.",
    "Brend emas, kiyimning o'tirganligi muhimroq.",
    "Aksessuarlar butun obrazning kayfiyatini o'zgartirishi mumkin.",
    "Monoxrom obraz doimo ongli va nafis ko'rinadi.",
    "Ko'p qatlamlilik kamroq kiyimdan ko'proq obraz yaratishning eng oson usuli.",
    "Yuz yonidagi kiyim rangi sizning ko'rinishingizga ta'sir qiladi.",
    "Sifat miqdordan doimo muhimroq.",
    "Yenglarni shimab qo'yish har qanday outfitni bir zumda erkin ko'rsatadi.",
    "Yaxshi daqlangan ko'ylak hatto eng oddiy obrazni ham ko'taradi.",
    "To'q ranglar ingichkalatadi, och ranglar hajm qo'shadi.",
    "Oyoq kiyim butun obrazning ohangini belgilaydi.",
    "Ko'ylagingizni ichkariga suqib qo'yish bo'sh obrazga tuzilma beradi.",
    "Naqsh aralashtiruv ishlaydi: biri yirik, ikkinchisi kichik bo'lsa.",
    "Oq krossovkalar deyarli hamma narsa bilan mos keladi.",
    "Kamar har qanday obrazning siluetini o'zgartirishi mumkin.",
    "Qattiq sumkalar resmiyroq, yumshoq sumkalar kundalikroq ko'rinadi.",
    "Vertikal chiziqlar tanani vizual ravishda cho'zadi.",
    "Sumkani tuflisi bilan moslashtirish — klassika va nafosatdir.",
    "Sovuq tonlar sovuq rang turiga, issiq tonlar issiq rang turiga to'g'ri keladi.",
    "Kamroq — ko'proq, ayniqsa aksessuarlarda.",
    "Klassik kiyimlar hech qachon modadan chiqmaydi.",
    "To'g'ri ichki kiyim har qanday kiyimning o'tirishini yaxshilaydi.",
    "Ro'mol — eng universal aksessuarlardan biri.",
    "Denim doim ishlaydi — bu universal mato.",
    "Bir obrazda bitta naqsh yetarli.",
    "Yaxshi o'tirgan obraz doimo modada.",
    "Ishonch — kiyib bo'ladigan eng yaxshi aksessuar.",
    "Yaxshi paltoga sarmoya kiriting — uni hamma narsa ustidan kiyasiz.",
    "Blazer deyarli har qanday obrazni tartibli ko'rsatadi.",
    "Tana tipingizni bilish aqlliroq kiyinishga yordam beradi.",
    "Mavsumiy rang palitralar garderobni yangi his ettiradi.",
    "Yaxshi yorug'lik har qanday obrazni ajoyib ko'rsatadi.",
    "Uslub — so'zsiz o'zingizni ifodalash usuli.",
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
  promoBannerTitle: 'Premium va Pro obunalariga 20% chegirma 🔥',
  promoBannerBody: 'Bugunoq obuna bo\'ling va AI stilistning barcha imkoniyatlarini oching.',
  promoBannerCta: 'Obuna bo\'lish',
  promoBannerTimerLabel: 'Taklif tugashiga',
  promoBannerNote: 'Taklif cheklangan vaqt davomida amal qiladi.',
  // ── Coach marks ────────────────────────────────────────────────
  coachAddTitle: "Kiyimlaringizni qo'shing",
  coachAddBody: "Istalgan kiyim rasmini yuklash uchun + bosing. AI fonni avtomatik olib tashlaydi.",
  coachGenerateTitle: 'Obraz yarating',
  coachGenerateBody: "✦ yulduz tugmasini bosing — AI kiyimlaringizni tayyor obrazga aralashtiradi.",
  coachEditTitle: 'Obrazni tahrirlang',
  coachEditBody: "Ko'chirish uchun torting, o'lchamni o'zgartirish uchun qistiring, kiyimni bosing → Almashtirish.",
  coachTryOnTitle: "O'zingizda ko'ring",
  coachTryOnBody: "AI yordamida istalgan obrazni virtual kiyib ko'ring — rasmingizni yuklang va natijani darhol ko'ring.",
  coachGotIt: "Tushundim →",
  // ── Enhanced empty states ───────────────────────────────────────
  emptyStep1: "Yuqori kiyim qo'shing",
  emptyStep2: "Pastki kiyim qo'shing",
  emptyStep3: 'Obraz yarating',
  emptyAddTap: "Qo'shish uchun bosing",
  generateHint: "Kiyimlaringizni tayyor outfit yaratamiz",
  noItemsInSection: "Hali narsalar yo'q",
  tapPlusToAdd: "Birinchi kiyimni qo'shish uchun + bosing",
  addUpperFirst: "Boshlash uchun yuqori kiyim qo'shing",
  addLowerOrShoes: "Pastki kiyim yoki oyoq kiyim qo'shing",
  saveNeedsTopItem: "Outfitni saqlash uchun kamida bitta yuqori kiyim qo'shing.",
  // ── Canvas hints ────────────────────────────────────────────────
  canvasEmptyHint: "Birinchi kiyimni qo'shish uchun + bosing",
  canvasHintDrag: "Ko'chirish uchun torting",
  canvasHintPinch: "O'lcham uchun qistiring",
  canvasHintSwap: "Bosing → Almashtirish",
  profile: 'Profil',
  replayTour: "Qo'llanmani qayta ko'rsatish",
  logout: 'Chiqish',
  theme: 'Mavzu',
  themeLight: 'oq',
  themeDark: 'qora',
  dayNames: ['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'],
  monthNames: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
  demoAddTitle: "O'z kiyimlaringizni qo'shing",
  demoAddBody: "Outfit yaratish va kiyib ko'rish uchun kiyimlaringiz rasmini yuklang!",
  tooFewItemsTitle: "Yangi obrazlar uchun kiyim yetarli emas",
  tooFewItemsBody: "Xilma-xil obrazlar uchun AI ko'proq kiyim kerak. Yangi kiyimlar qo'shing!",
  outfitsExhaustedTitle: "Obrazlar yaratilmoqda",
  outfitsExhaustedBody: "AI yangi kombinatsiyalarni qidirmoqda. 30–60 soniyadan so'ng ✦ tugmasini bosing.",
  addClothingBtn: "Kiyim qo'shish",
  readyLabel: '✓ Tayyor!',
  moreNeeded: 'yana {n} ta',
  regenerateWithAI: 'AI bilan yangilash',
  aiThinking: "AI o'ylayapti…",

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
