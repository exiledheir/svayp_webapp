// All Firebase Analytics event names and parameter key constants.
// Mirrors the mobile app's analytics_events.dart pattern.

export const Events = {
  // ── Closet Screen ──────────────────────────────────────────────────────────
  CLOSET_SCREEN_VIEWED: 'closet_screen_viewed',
  CLOSET_ITEM_DELETED: 'closet_item_deleted',
  // Календарь — вкладка внутри /closet, а не отдельный роут, поэтому по screen_view
  // он неотличим от досок и образов. Без собственного события его использование
  // не измеряется вовсе.
  CLOSET_CALENDAR_VIEWED: 'closet_calendar_viewed',
  CLOSET_GUIDE_OPENED: 'closet_guide_opened',
  CLOSET_GUIDE_VIDEO_PLAYED: 'closet_guide_video_played',
  CLOSET_FEEDBACK_CTA_TAPPED: 'closet_feedback_cta_tapped',
  // "Add N items to unlock" get-started card (persistent closet nudge)
  GET_STARTED_CARD_VIEWED: 'get_started_card_viewed',
  GET_STARTED_CARD_ADD_TAPPED: 'get_started_card_add_tapped',
  GET_STARTED_CARD_DISMISSED: 'get_started_card_dismissed',
  GET_STARTED_CARD_COMPLETED: 'get_started_card_completed',

  // ── First-run closet setup (blocking two-slot screen) ─────────────────────
  // Primary metric: % of registrations reaching SETUP_COMPLETED. Watch the gap
  // between SETUP_FIRST_ITEM_ADDED and SETUP_COMPLETED — that's where the old
  // empty-closet screen lost people.
  SETUP_SHOWN: 'setup_shown',
  SETUP_MODE_SWITCHED: 'setup_mode_switched',
  SETUP_SLOT_TAPPED: 'setup_slot_tapped',
  SETUP_PICKER_OPENED: 'setup_picker_opened',
  SETUP_PICKER_SOURCE_CHOSEN: 'setup_picker_source_chosen',
  SETUP_ITEM_PROCESSING_STARTED: 'setup_item_processing_started',
  SETUP_ITEM_ADDED: 'setup_item_added',
  SETUP_ITEM_FAILED: 'setup_item_failed',
  SETUP_BEAUTIFY_STARTED: 'setup_beautify_started',
  SETUP_BEAUTIFY_COMPLETED: 'setup_beautify_completed',
  SETUP_BEAUTIFY_FAILED: 'setup_beautify_failed',
  SETUP_BEAUTIFY_COMMITTED: 'setup_beautify_committed',
  SETUP_TRYON_TAPPED: 'setup_tryon_tapped',
  SETUP_FIRST_ITEM_ADDED: 'setup_first_item_added',
  SETUP_COMPLETED: 'setup_completed',
  SETUP_FIRST_OUTFIT_GENERATED: 'setup_first_outfit_generated',

  // ── Add Item Funnel ────────────────────────────────────────────────────────
  ADD_ITEM_STARTED: 'add_item_started',
  ADD_ITEM_PHOTO_SELECTED: 'add_item_photo_selected',
  ADD_ITEM_BG_REMOVAL_COMPLETED: 'add_item_bg_removal_completed',
  ADD_ITEM_BG_REMOVAL_FAILED: 'add_item_bg_removal_failed',
  ADD_ITEM_CATEGORY_SELECTED: 'add_item_category_selected',
  ADD_ITEM_SAVED: 'add_item_saved',

  // ── Closet v2: detect & review, beautify, catalog, item detail ─────────────
  REVIEW_SHEET_VIEWED: 'review_sheet_viewed',
  REVIEW_ITEM_CORRECTED: 'review_item_corrected',
  REVIEW_NAME_EDITED: 'review_name_edited',
  REVIEW_CONFIRMED: 'review_confirmed',
  REVIEW_TRYON_TAPPED: 'review_tryon_tapped',
  BEAUTIFY_STARTED: 'beautify_started',
  BEAUTIFY_COMPLETED: 'beautify_completed',
  BEAUTIFY_FAILED: 'beautify_failed',
  BEAUTIFY_CHOICE_COMMITTED: 'beautify_choice_committed',
  LIBRARY_ITEM_ADDED: 'library_item_added',
  ITEM_DETAIL_VIEWED: 'item_detail_viewed',
  ITEM_MARKED_WORN: 'item_marked_worn',

  // ── Outfit Generation Funnel ───────────────────────────────────────────────
  OUTFITS_TAB_VIEWED: 'outfits_tab_viewed',
  OUTFIT_GENERATE_TAPPED: 'outfit_generate_tapped',
  OUTFIT_GENERATION_STARTED: 'outfit_generation_started',
  OUTFIT_GENERATION_COMPLETED: 'outfit_generation_completed',
  OUTFIT_GENERATION_FAILED: 'outfit_generation_failed',
  OUTFIT_BOARD_SAVED: 'outfit_board_saved',
  OUTFIT_BOARD_EDITED: 'outfit_board_edited',
  OUTFIT_BOARD_DELETED: 'outfit_board_deleted',

  // ── Try-On Funnel ──────────────────────────────────────────────────────────
  TRYON_INITIATED: 'tryon_initiated',
  TRYON_PROCESSING_STARTED: 'tryon_processing_started',
  TRYON_COMPLETED: 'tryon_completed',
  TRYON_FAILED: 'tryon_failed',
  TRYON_RESULT_SAVED: 'tryon_result_saved',
  TRYON_RESULT_DISMISSED: 'tryon_result_dismissed',
  TRYON_HISTORY_VIEWED: 'tryon_history_viewed',
  TRYON_FEEDBACK_RATED: 'tryon_feedback_rated',
  TRYON_FEEDBACK_SUBMITTED: 'tryon_feedback_submitted',

  // ── Wardrobe milestones & abandonment ──────────────────────────────────────
  WARDROBE_MILESTONE: 'wardrobe_milestone',
  ADD_ITEM_ABANDONED: 'add_item_abandoned',
  TRYON_ABANDONED: 'tryon_abandoned',

  // ── Визуальный поиск ───────────────────────────────────────────────────────
  // Использованием считается показ результатов, а не открытие камеры: открыл и
  // передумал — это не поиск.
  VISUAL_SEARCH_OPENED: 'visual_search_opened',
  VISUAL_SEARCH_RESULTS: 'visual_search_results',
  VISUAL_SEARCH_FAILED: 'visual_search_failed',

  // ── Discover (веб-свайп) — имена совпадают с мобилкой для кросс-платформы ──
  DISCOVER_VIEWED: 'discover_viewed',
  PRODUCT_IMPRESSION: 'product_impression',
  PRODUCT_SWIPED: 'product_swiped',
  PRODUCT_DETAIL_OPENED: 'product_detail_opened',
  PRODUCT_ADDED_TO_CART: 'product_added_to_cart',
  SWIPE_UNDO: 'swipe_undo',
  FEED_EXHAUSTED: 'feed_exhausted',

  // ── Upgrade / Plans Funnel ─────────────────────────────────────────────────
  UPGRADE_MODAL_SHOWN: 'upgrade_modal_shown',
  UPGRADE_MODAL_DISMISSED: 'upgrade_modal_dismissed',
  UPGRADE_CTA_TAPPED: 'upgrade_cta_tapped',

  // ── Onboarding Funnel ──────────────────────────────────────────────────────
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_SLIDE_VIEWED: 'onboarding_slide_viewed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
  // Уход из онбординга без явного «пропустить» — иначе половина отвала невидима
  ONBOARDING_ABANDONED: 'onboarding_abandoned',
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  BEAUTIFY_REVEAL_VIEWED: 'beautify_reveal_viewed',

  // ── Market (C2C) Funnel ────────────────────────────────────────────────────
  MARKET_FEED_VIEWED: 'market_feed_viewed',
  MARKET_LISTING_VIEWED: 'market_listing_viewed',
  MARKET_ONBOARDING_VIEWED: 'market_onboarding_viewed',
  MARKET_ONBOARDING_COMPLETED: 'market_onboarding_completed',
  MARKET_LISTING_STARTED: 'market_listing_started',
  MARKET_LISTING_STEP_VIEWED: 'market_listing_step_viewed',
  MARKET_LISTING_STEP_COMPLETED: 'market_listing_step_completed',
  MARKET_LISTING_DRAFT_SAVED: 'market_listing_draft_saved',
  MARKET_LISTING_PUBLISHED: 'market_listing_published',
  MARKET_LISTING_UPDATED: 'market_listing_updated',
  MARKET_LISTING_STATUS_CHANGED: 'market_listing_status_changed',
  MARKET_LISTING_ABANDONED: 'market_listing_abandoned',
  MARKET_CONTACT_CHAT_TAPPED: 'market_contact_chat_tapped',
  MARKET_CONTACT_CALL_TAPPED: 'market_contact_call_tapped',
  MARKET_CONTACT_TELEGRAM_TAPPED: 'market_contact_telegram_tapped',
  MARKET_FAVORITE_TOGGLED: 'market_favorite_toggled',
  MARKET_SUPPORT_BANNER_TAPPED: 'market_support_banner_tapped',

  // ── Лента (Feed) Funnel ────────────────────────────────────────────────────
  FEED_VIEWED: 'feed_viewed',
  FEED_POST_VIEWED: 'feed_post_viewed',
  FEED_POST_CREATE_STARTED: 'feed_post_create_started',
  FEED_SOURCE_SELECTED: 'feed_source_selected',
  FEED_COMPOSE_VIEWED: 'feed_compose_viewed',
  FEED_POST_PUBLISHED: 'feed_post_published',
  FEED_POST_PUBLISH_FAILED: 'feed_post_publish_failed',
  // Молчаливый уход из редактора поста — без него видно только явные ошибки публикации
  FEED_POST_ABANDONED: 'feed_post_abandoned',
  FEED_POST_DELETED: 'feed_post_deleted',
  FEED_LIKE_TOGGLED: 'feed_like_toggled',
  FEED_PROFILE_VIEWED: 'feed_profile_viewed',
  FEED_PROFILE_EDITED: 'feed_profile_edited',
  FEED_POST_REPORTED: 'feed_post_reported',
  FEED_USER_HIDDEN: 'feed_user_hidden',
  FEED_PUBLISH_FROM_CLOSET: 'feed_publish_from_closet',
  FEED_POST_IMPRESSION: 'feed_post_impression',
  FEED_SCROLL_DEPTH: 'feed_scroll_depth',
} as const;

export const Params = {
  ITEM_COUNT: 'item_count',
  OUTFIT_COUNT: 'outfit_count',
  PLAN_TIER: 'plan_tier',
  CATEGORY: 'category',
  SOURCE: 'source',
  DURATION_MS: 'duration_ms',
  ERROR_CODE: 'error_code',
  TRIGGER: 'trigger',
  CURRENT_PLAN: 'current_plan',
  DESTINATION: 'destination',
  SLIDE_INDEX: 'slide_index',
  OUTFIT_ITEM_COUNT: 'outfit_item_count',
  OUTFIT_COUNT_RETURNED: 'outfit_count_returned',
  HAS_BG_REMOVED: 'has_background_removed',
  HISTORY_COUNT: 'history_count',
  BOARD_COUNT: 'board_count',
  ITEM_COUNT_IN_WARDROBE: 'item_count_in_wardrobe',
  AT_SLIDE_INDEX: 'at_slide_index',
  OB_STEP: 'ob_step',
  // First-run closet setup
  MODE: 'mode',
  SLOT: 'slot',
  REASON: 'reason',
  MS_SINCE_SHOWN: 'ms_since_shown',
  MK_STEP: 'mk_step',
  MK_CATEGORY: 'mk_category',
  MK_DEAL_TYPE: 'mk_deal_type',
  MK_CONTACT_METHOD: 'mk_contact_method',
  MK_HAS_TELEGRAM_USERNAME: 'mk_has_telegram_username',
  FEED_SOURCE_TYPE: 'feed_source_type',
  FEED_IMAGE_COUNT: 'feed_image_count',
  FEED_HAS_REAL_PHOTO: 'feed_has_real_photo',
  FEED_REPORT_REASON: 'feed_report_reason',
  // Общие идентификаторы контекста
  FLOW: 'flow',
  LISTING_ID: 'listing_id',
  POST_ID: 'post_id',
  PRODUCT_ID: 'product_id',
  DIRECTION: 'direction',
  POSITION: 'position',
  VIEW_DURATION_MS: 'view_duration_ms',
  STEP: 'step',
  DEPTH: 'depth',
  SIZE: 'size',
  COLOR: 'color',
  BRAND: 'brand',
  PRICE: 'price',
  CHOICE: 'choice',
  FIELD: 'field',
  RATING: 'rating',
  HAS_COMMENT: 'has_comment',
} as const;
