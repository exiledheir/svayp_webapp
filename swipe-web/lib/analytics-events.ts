// All Firebase Analytics event names and parameter key constants.
// Mirrors the mobile app's analytics_events.dart pattern.

export const Events = {
  // ── Closet Screen ──────────────────────────────────────────────────────────
  CLOSET_SCREEN_VIEWED: 'closet_screen_viewed',
  CLOSET_ITEM_DELETED: 'closet_item_deleted',

  // ── Add Item Funnel ────────────────────────────────────────────────────────
  ADD_ITEM_STARTED: 'add_item_started',
  ADD_ITEM_PHOTO_SELECTED: 'add_item_photo_selected',
  ADD_ITEM_BG_REMOVAL_COMPLETED: 'add_item_bg_removal_completed',
  ADD_ITEM_BG_REMOVAL_FAILED: 'add_item_bg_removal_failed',
  ADD_ITEM_CATEGORY_SELECTED: 'add_item_category_selected',
  ADD_ITEM_SAVED: 'add_item_saved',

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

  // ── Upgrade / Plans Funnel ─────────────────────────────────────────────────
  UPGRADE_MODAL_SHOWN: 'upgrade_modal_shown',
  UPGRADE_MODAL_DISMISSED: 'upgrade_modal_dismissed',
  UPGRADE_CTA_TAPPED: 'upgrade_cta_tapped',

  // ── Onboarding Funnel ──────────────────────────────────────────────────────
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_SLIDE_VIEWED: 'onboarding_slide_viewed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',

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
  MK_STEP: 'mk_step',
  MK_CATEGORY: 'mk_category',
  MK_DEAL_TYPE: 'mk_deal_type',
  MK_CONTACT_METHOD: 'mk_contact_method',
  MK_HAS_TELEGRAM_USERNAME: 'mk_has_telegram_username',
} as const;
