export type Locale = 'en' | 'ru' | 'uz';

export interface Translations {
  today: string;
  weekend: string;
  nextSevenDays: string;
  marketTitle: string;
  closetTitle: string;
  marketComingSoonTitle: string;
  marketComingSoonText: string;
  // ── Market (C2C) ──────────────────────────────────────────────────────────
  mk_post_cta: string;
  mk_sell_short: string;
  mk_my_listings: string;
  mk_empty_feed: string;
  mk_categories: string;
  mk_all_categories: string;
  mk_search_placeholder: string;
  mk_visual_search: string;
  mk_banner_sell_title: string;
  mk_banner_sell_sub: string;
  mk_banner_contact_title: string;
  mk_banner_contact_sub: string;
  mk_free: string;
  mk_negotiable: string;
  mk_courier_available: string;
  mk_intro_title: string;
  mk_intro_subtitle: string;
  mk_intro_step1: string;
  mk_intro_step2: string;
  mk_intro_step3: string;
  mk_intro_done: string;
  mk_save_exit: string;
  mk_apply: string;
  mk_continue: string;
  mk_details_title: string;
  mk_status_review: string;
  mk_status_active: string;
  mk_status_sold: string;
  mk_status_archived: string;
  mk_status_rejected: string;
  mk_manage_title: string;
  mk_manage_edit: string;
  mk_manage_edit_resubmit: string;
  mk_manage_mark_active: string;
  mk_manage_mark_sold: string;
  mk_manage_archive: string;
  mk_manage_status: string;
  mk_status_locked_note: string;
  mk_status_confirm_title: string;
  mk_status_confirm_body: string;
  mk_cancel: string;
  mk_delete_confirm_title: string;
  mk_delete_confirm_body: string;
  mk_rejected_note: string;
  mk_pending_note: string;
  mk_updated_title: string;
  mk_updated_body: string;
  mk_resubmit_title: string;
  mk_resubmit_body: string;
  mk_save_changes: string;
  mk_photos_title: string;
  mk_photos_hint: string;
  mk_photos_tips_title: string;
  mk_photos_tips_cta: string;
  mk_photos_from_gallery: string;
  mk_photos_from_camera: string;
  mk_photos_min_error: string;
  mk_photos_size_error: string;
  mk_photos_max_error: string;
  mk_crop_title: string;
  mk_title_title: string;
  mk_title_placeholder: string;
  mk_category_title: string;
  mk_category_suggested: string;
  mk_category_other: string;
  mk_char_title: string;
  mk_char_condition: string;
  mk_char_brand: string;
  mk_brand_none: string;
  mk_brand_other: string;
  mk_brand_custom_ph: string;
  mk_size_one: string;
  mk_char_size: string;
  mk_char_season: string;
  mk_char_length: string;
  mk_char_color: string;
  mk_char_select: string;
  mk_char_modesty: string;
  mk_char_fit: string;
  mk_char_material: string;
  mk_char_country: string;
  mk_search: string;
  mk_char_yes: string;
  mk_char_no: string;
  mk_cond_used_good: string;
  mk_cond_used_visible: string;
  mk_cond_used_defects: string;
  mk_cond_new_with_tag: string;
  mk_season_demi: string;
  mk_season_winter: string;
  mk_season_summer: string;
  mk_season_all: string;
  mk_length_maxi: string;
  mk_length_midi: string;
  mk_length_mini: string;
  mk_color_black: string;
  mk_color_white: string;
  mk_color_beige: string;
  mk_color_gray: string;
  mk_color_blue: string;
  mk_color_lightblue: string;
  mk_color_red: string;
  mk_color_green: string;
  mk_color_yellow: string;
  mk_color_pink: string;
  mk_color_brown: string;
  mk_color_purple: string;
  mk_color_orange: string;
  mk_color_multicolor: string;
  mk_deal_title: string;
  mk_deal_conditions: string;
  mk_deal_sell: string;
  mk_deal_free: string;
  mk_deal_price: string;
  mk_currency_uzs: string;
  mk_currency_usd: string;
  mk_deal_urgent: string;
  mk_desc_title: string;
  mk_desc_placeholder: string;
  mk_loc_title: string;
  mk_loc_region_label: string;
  mk_loc_district_label: string;
  mk_loc_district_ph: string;
  mk_loc_search: string;
  mk_loc_map: string;
  mk_loc_map_change: string;
  mk_loc_pick_title: string;
  mk_loc_pick_hint: string;
  mk_loc_map_confirm: string;
  mk_loc_use_current: string;
  mk_loc_map_error: string;
  mk_loc_pinned: string;
  mk_photos_add: string;
  mk_photos_over_cap: string;
  mk_no_image: string;
  mk_category_choose: string;
  mk_contact_tg_note: string;
  mk_contact_tg_username_ph: string;
  mk_loc_landmark_label: string;
  mk_loc_landmark_ph: string;
  mk_loc_courier_note: string;
  mk_loc_courier: string;
  mk_phone_title: string;
  mk_phone_subtitle: string;
  mk_phone_confirm: string;
  mk_phone_send_code: string;
  mk_phone_authed_note: string;
  mk_promote_title: string;
  mk_promote_skip: string;
  mk_promote_maxi: string;
  mk_promote_up: string;
  mk_promote_premium: string;
  mk_contacts_title: string;
  mk_contacts_name: string;
  mk_contacts_name_ph: string;
  mk_contacts_methods: string;
  mk_contacts_need_one: string;
  mk_contact_chat: string;
  mk_contact_chat_note: string;
  mk_contact_telegram: string;
  mk_contact_call: string;
  mk_contact_call_note: string;
  mk_seller_contacts: string;
  mk_contact_chat_libas: string;
  mk_contact_via_telegram: string;
  mk_publish_cta: string;
  mk_publish_error: string;
  mk_published_title: string;
  mk_published_body: string;
  mk_published_view: string;
  mk_published_back: string;
  mk_detail_characteristics: string;
  mk_detail_description: string;
  mk_detail_location: string;
  mk_detail_open_map: string;
  mk_detail_seller: string;
  mk_write: string;
  mk_mine_title: string;
  mk_liked_title: string;
  mk_liked_empty: string;
  mk_mine_drafts: string;
  mk_mine_published: string;
  mk_mine_empty: string;
  mk_mine_continue: string;
  mk_mine_delete: string;
  mk_draft_label: string;
  mk_chat_compose_ph: string;
  mk_chat_send: string;
  mk_chat_title: string;
  mk_chat_seller_reply: string;
  myOutfits: string;
  tabBoards: string;
  tabOutfits: string;
  tabDressMe: string;
  tabCalendar: string;
  noTryOnsYet: string;
  noTryOnsHint: string;
  dressMeNeedsItems: string;
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
  // Add-item wizard (2 steps: crop → details)
  closetCropTitle: string;
  closetCropHint: string;
  closetDetailsTitle: string;
  closetDetailsHint: string;
  // Item options picker (new taxonomy)
  optSection: string;
  optType: string;
  optSubtype: string;
  optLength: string;
  optFit: string;
  stepChecking: string;
  stepGenerating: string;
  stepRemovingBg: string;
  stepAnalyzing: string;
  stepAlmostDone: string;
  stepProcessing: string;
  delete: string;
  save: string;
  share: string;
  shareToFeed: string;
  shareExternal: string;
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
  outfitCanvases: string;
  regens: string;
  ruleBasedOutfits: string;
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
  continueWithGoogle: string;
  continueWithApple: string;
  signingIn: string;
  socialAuthError: string;
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
  // ── Interactive onboarding wizard ──
  ob_skip: string;
  ob_add_any_photo: string;
  ob_beautify_title: string;
  ob_beautify_subtitle: string;
  ob_beautify_before: string;
  ob_beautify_after: string;
  ob_beautify_cta: string;
  gs_title: string;
  gs_progress: string;
  gs_cta: string;
  gs_dismiss: string;
  // ── Closet v2 (add & try-on redesign) ──────────────────────────────────────
  cv_hero_title: string;
  cv_hero_subtitle: string;
  cv_add_item: string;
  cv_add_title: string;
  cv_add_reassure: string;
  // Build-your-closet gate (unlock once a top + a bottom exist)
  cv_build_title: string;
  cv_build_subtitle: string;
  cv_build_top: string;
  cv_build_bottom: string;
  cv_build_dress: string;
  cv_build_shoes: string;
  cv_build_adding: string;
  cv_show_bt_title: string;
  cv_show_bt_cap: string;
  cv_show_to_title: string;
  cv_show_to_cap: string;
  cv_show_to_mannequin: string;
  cv_show_to_me: string;
  cv_show_to_covered: string;
  // ── Diamonds (coins) ──────────────────────────────────────────────────────
  cn_title: string;
  cn_have: string;
  cn_need_more: string;
  cn_do_title: string;
  cn_do_upload: string;
  cn_free: string;
  cn_do_outfit: string;
  cn_do_beautify: string;
  cn_do_tryon: string;
  cn_pack_title: string;
  cn_off: string;
  cn_custom: string;
  cn_custom_ph: string;
  cn_total: string;
  cn_hint_next: string;
  cn_warn: string;
  cn_survey: string;
  cn_buy: string;
  cn_note: string;
  cn_currency: string;
  cn_tg_msg: string;
  // Batch add — processing screen + "fix category" sheet
  cv_proc_removing: string;
  cv_proc_identifying: string;
  cv_fix_title: string;
  cv_fix_subtitle: string;
  cv_fix_done: string;
  cv_fix_later: string;
  cv_src_gallery: string;
  cv_src_gallery_sub: string;
  cv_src_camera: string;
  cv_src_camera_sub: string;
  cv_shop_title: string;
  cv_shop_add_n: string;
  cv_shop_hint: string;
  cv_shop_search: string;
  cv_shop_added: string;
  cv_shop_empty: string;
  cv_rv_adding: string;
  cv_rv_new_items: string;
  cv_rv_identifying: string;
  cv_rv_select_all: string;
  cv_rv_delete: string;
  cv_rv_beautify_banner: string;
  cv_rv_confirm: string;
  cv_rv_add_to_closet: string;
  cv_rv_detail_view: string;
  cv_rv_add_details: string;
  cv_rv_complete_hint: string;
  cv_rv_tryon: string;
  cv_rv_edit_cat: string;
  cv_rv_more: string;
  cv_rv_added_toast: string;
  cv_rv_rejected: string;
  cv_rv_processing: string;
  cv_bt_button: string;
  cv_bt_title: string;
  cv_bt_subtitle: string;
  cv_bt_original: string;
  cv_bt_beautified: string;
  cv_bt_save: string;
  cv_bt_keep: string;
  cv_bt_working: string;
  cv_bt_ready: string;
  cv_bt_failed: string;
  cv_bt_soon: string;
  cv_dt_original: string;
  cv_dt_beautified: string;
  cv_dt_color: string;
  cv_dt_season: string;
  cv_dt_material: string;
  cv_dt_pattern: string;
  cv_dt_style: string;
  cv_dt_worn: string;
  cv_dt_worn_never: string;
  cv_dt_mark_worn: string;
  cv_dt_tryon: string;
  cv_dt_name_placeholder: string;
  cv_bt_intro_title: string;
  cv_bt_intro_body: string;
  cv_bt_intro_cta: string;
  cv_bt_auto_kicker: string;
  cv_bt_auto_headline: string;
  cv_bt_intro_caption: string;
  cv_bt_intro_do: string;
  cv_bt_intro_skip: string;
  cv_bt_intro_skip_add: string;
  cv_bt_never: string;
  cv_bt_per_photo: string;
  ob_welcome_title: string;
  ob_welcome_body: string;
  ob_welcome_cta: string;
  ob_add_upper_title: string;
  ob_add_upper_body: string;
  ob_add_lower_title: string;
  ob_add_lower_body: string;
  ob_add_shoes_title: string;
  ob_add_shoes_body: string;
  ob_add_pick_photo: string;
  ob_add_take_photo: string;
  ob_add_choose_category: string;
  ob_add_save: string;
  ob_add_change_photo: string;
  ob_add_processing: string;
  ob_dress_skip_toast: string;
  ob_generate_title: string;
  ob_generate_body: string;
  ob_generate_cta: string;
  ob_generating: string;
  ob_generate_again: string;
  ob_generate_continue: string;
  ob_edit_title: string;
  ob_edit_body: string;
  ob_edit_cta: string;
  ob_edit_open: string;
  ob_tryon_title: string;
  ob_tryon_body: string;
  ob_tryon_cta: string;
  ob_tryon_quota_note: string;
  ob_tryon_continue: string;
  ob_done_title: string;
  ob_done_body: string;
  ob_done_cta: string;
  tryOnConfirmTitle: string;
  tryOnConfirmBody: string;
  tryOnCancel: string;
  tryOnConfirm: string;
  tryOnTargetMannequin: string;
  tryOnTargetMannequinHint: string;
  tryOnTargetSelf: string;
  tryOnTargetSelfHint: string;
  tryOnUploadPhoto: string;
  tryOnChangePhoto: string;
  tryOnPhotoHint: string;
  tryOnUploading: string;
  tryOnPhotoFailed: string;
  tryOnPhotoWhatTitle: string;
  tryOnPhotoWhatBody: string;
  tryOnDeleteTitle: string;
  tryOnDeleteBody: string;
  tryOnDeleteFailed: string;
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
  tryOnFailedSafety: string;
  tryOnFailedTimeout: string;
  tryOnFailedGeneric: string;
  close: string;
  retry: string;
  loadMore: string;
  myLooks: string;
  myLooksSaved: string;
  myLooksEmpty: string;
  myLooksEmptyHint: string;
  myLooksSaveLook: string;
  justNow: string;
  minutesAgo: string;
  yesterday: string;
  feedbackBannerTitle: string;
  feedbackBannerBody: string;
  feedbackBannerCta: string;
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
  // ── Canvas move demo (onboarding) ───────────────────────────────
  canvasDemoIntro: string;
  canvasDemoSwap: string;
  canvasDemoDone: string;
  profile: string;
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
  generateOutfitLabel: string;
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
  categoryLabels: Record<string, string>;
  // ── Лента (Feed) ──
  feed_tab: string;
  feed_title: string;
  feed_empty: string;
  feed_publish_cta: string;
  feed_publish_short: string;
  feed_pick_sources_title: string;
  feed_select_hint: string;
  feed_no_sources: string;
  feed_next: string;
  feed_add_more: string;
  feed_refresh: string;
  feed_src_library: string;
  feed_lib_add: string;
  feed_section_empty: string;
  feed_add_tryon_title: string;
  feed_add_tryon_body: string;
  feed_add_tryon_cta: string;
  feed_add_tryon_skip: string;
  feed_caption_placeholder: string;
  feed_caption_label: string;
  feed_compose_title: string;
  feed_compose_subtitle: string;
  feed_privacy_notice_flatlay: string;
  feed_privacy_notice_realphoto: string;
  feed_publishing: string;
  feed_publish_error: string;
  feed_nsfw_blocked: string;
  feed_published_title: string;
  feed_published_body: string;
  feed_go_to_feed: string;
  feed_go_to_profile: string;
  feed_report: string;
  feed_report_title: string;
  feed_reason_inappropriate: string;
  feed_reason_spam: string;
  feed_reason_not_fashion: string;
  feed_reason_copyright: string;
  feed_reason_other: string;
  feed_report_message_placeholder: string;
  feed_report_submit: string;
  feed_report_done: string;
  feed_hide_user: string;
  feed_hidden_done: string;
  feed_delete: string;
  feed_delete_confirm_title: string;
  feed_delete_confirm_body: string;
  feed_cancel: string;
  feed_profile_posts: string;
  feed_profile_likes: string;
  feed_profile_followers: string;
  feed_follow: string;
  feed_following: string;
  feed_message: string;
  feed_followers_title: string;
  feed_followers_empty: string;
  feed_profile_following: string;
  feed_following_title: string;
  feed_following_empty: string;
  feed_activity_title: string;
  feed_tab_liked: string;
  feed_tab_commented: string;
  feed_liked_empty: string;
  feed_commented_empty: string;
  feed_comments_title: string;
  feed_comments_empty: string;
  feed_view_comments: string;
  feed_add_comment_ph: string;
  feed_comment_send: string;
  feed_edit_profile: string;
  feed_profile_empty: string;
  feed_display_name: string;
  feed_username: string;
  feed_username_taken: string;
  feed_username_available: string;
  feed_username_required: string;
  feed_bio: string;
  feed_save: string;
  feed_avatar: string;
}

const en: Translations = {
  today: 'Today',
  weekend: 'Weekend',
  nextSevenDays: 'Next 7 Days',
  marketTitle: 'Market',
  closetTitle: 'Closet',
  marketComingSoonTitle: 'Coming soon',
  marketComingSoonText: 'Soon, the place where you can sell your things',
  // ── Market (C2C) ──
  mk_post_cta: 'Post a listing',
  mk_sell_short: 'Sell',
  mk_my_listings: 'My listings',
  mk_empty_feed: 'No listings yet',
  mk_categories: 'Categories',
  mk_all_categories: 'All categories',
  mk_search_placeholder: 'Search listings',
  mk_visual_search: 'Visual search',
  mk_banner_sell_title: 'Sell faster',
  mk_banner_sell_sub: 'List your items in minutes',
  mk_banner_contact_title: 'Contact us',
  mk_banner_contact_sub: 'Questions or feedback? Chat with our team',
  mk_free: 'Free',
  mk_negotiable: 'Negotiable',
  mk_courier_available: 'Courier delivery',
  mk_intro_title: 'How to post listings?',
  mk_intro_subtitle: '3 simple steps',
  mk_intro_step1: 'Title and 3–4 photos',
  mk_intro_step2: 'Price and all details',
  mk_intro_step3: 'Contacts and deal place',
  mk_intro_done: 'Listing is live in the feed',
  mk_save_exit: 'Save and exit',
  mk_apply: 'Apply',
  mk_continue: 'Continue',
  mk_details_title: 'Tell us about the item',
  mk_status_review: 'Under review',
  mk_status_active: 'Active',
  mk_status_sold: 'Sold',
  mk_status_archived: 'Archived',
  mk_status_rejected: 'Rejected',
  mk_manage_title: 'Manage',
  mk_manage_edit: 'Edit listing',
  mk_manage_edit_resubmit: 'Edit & resubmit',
  mk_manage_mark_active: 'Mark as active',
  mk_manage_mark_sold: 'Mark as sold',
  mk_manage_archive: 'Archive',
  mk_manage_status: 'Change status',
  mk_status_locked_note: 'This listing is under review. You can change its status once it’s approved.',
  mk_status_confirm_title: 'Change status?',
  mk_status_confirm_body: 'Mark this listing as “{status}”?',
  mk_cancel: 'Cancel',
  mk_delete_confirm_title: 'Delete listing?',
  mk_delete_confirm_body: "This can't be undone.",
  mk_rejected_note: 'This listing was rejected. Edit it and resubmit for review.',
  mk_pending_note: "It's under review — you can edit or delete it while you wait.",
  mk_updated_title: 'Changes saved',
  mk_updated_body: 'Your listing has been updated.',
  mk_resubmit_title: 'Sent for review',
  mk_resubmit_body: "We'll review your changes and publish it soon.",
  mk_save_changes: 'Save changes',
  mk_photos_title: 'Add listing photos',
  mk_photos_hint: 'You can add 1 to 10 photos. Each photo must be under 10 MB and at least 300×300.',
  mk_photos_tips_title: 'How to take the perfect photo?',
  mk_photos_tips_cta: 'See tips',
  mk_photos_from_gallery: 'Gallery',
  mk_photos_from_camera: 'Camera',
  mk_photos_min_error: 'Photo must be at least 300×300',
  mk_photos_size_error: 'Photo must be under 10 MB',
  mk_photos_max_error: 'You can add up to 10 photos',
  mk_crop_title: 'Crop photo',
  mk_title_title: 'Enter the listing title',
  mk_title_placeholder: 'E.g. Polo skirt',
  mk_category_title: 'Choose a category',
  mk_category_suggested: 'Suggested for you',
  mk_category_other: 'Other category',
  mk_char_title: 'Specify characteristics',
  mk_char_condition: 'Condition',
  mk_char_brand: 'Brand',
  mk_brand_none: 'No brand',
  mk_brand_other: 'Other brand',
  mk_brand_custom_ph: 'Enter brand name',
  mk_size_one: 'One size',
  mk_char_size: 'Size',
  mk_char_season: 'Season',
  mk_char_length: 'Item length',
  mk_char_color: 'Color',
  mk_char_select: 'Select a value',
  mk_char_modesty: 'Suitable for covered',
  mk_char_fit: 'Fit',
  mk_char_material: 'Material',
  mk_char_country: 'Country of origin',
  mk_search: 'Search',
  mk_char_yes: 'Yes',
  mk_char_no: 'No',
  mk_cond_used_good: 'Used (excellent, like new)',
  mk_cond_used_visible: 'Used (signs of wear)',
  mk_cond_used_defects: 'Used (noticeable defects)',
  mk_cond_new_with_tag: 'New (with tag, in package)',
  mk_season_demi: 'Mid-season',
  mk_season_winter: 'Winter',
  mk_season_summer: 'Summer',
  mk_season_all: 'All seasons',
  mk_length_maxi: 'Maxi',
  mk_length_midi: 'Midi',
  mk_length_mini: 'Mini',
  mk_color_black: 'Black',
  mk_color_white: 'White',
  mk_color_beige: 'Beige',
  mk_color_gray: 'Gray',
  mk_color_blue: 'Blue',
  mk_color_lightblue: 'Light blue',
  mk_color_red: 'Red',
  mk_color_green: 'Green',
  mk_color_yellow: 'Yellow',
  mk_color_pink: 'Pink',
  mk_color_brown: 'Brown',
  mk_color_purple: 'Purple',
  mk_color_orange: 'Orange',
  mk_color_multicolor: 'Multicolor',
  mk_deal_title: 'Specify deal terms',
  mk_deal_conditions: 'Terms',
  mk_deal_sell: 'Set a price',
  mk_deal_free: 'Give away free',
  mk_deal_price: 'Price',
  mk_currency_uzs: 'UZS',
  mk_currency_usd: 'c.u.',
  mk_deal_urgent: 'Selling urgently. Negotiable',
  mk_desc_title: 'Add a description',
  mk_desc_placeholder: 'Describe the item: material, features, reason for selling',
  mk_loc_title: 'Specify the meeting place with the buyer',
  mk_loc_region_label: 'Region',
  mk_loc_district_label: 'District',
  mk_loc_district_ph: 'Choose a district',
  mk_loc_search: 'Address, store or metro',
  mk_loc_map: 'Pick on map',
  mk_loc_map_change: 'Change location on map',
  mk_loc_pick_title: 'Choose location',
  mk_loc_pick_hint: 'Move the map so the pin marks the exact spot.',
  mk_loc_map_confirm: 'Confirm location',
  mk_loc_use_current: 'Use my location',
  mk_loc_map_error: "Couldn't load the map. Check your connection.",
  mk_loc_pinned: 'Location selected',
  mk_photos_add: 'Add photos',
  mk_photos_over_cap: 'Only the first {n} photos are saved (demo, no backend).',
  mk_no_image: 'No image',
  mk_category_choose: 'Choose a category',
  mk_contact_tg_note: 'Add your Telegram username so buyers can message you on Telegram.',
  mk_contact_tg_username_ph: 'username',
  mk_loc_landmark_label: 'Specify a landmark',
  mk_loc_landmark_ph: 'E.g. Alay bazaar',
  mk_loc_courier_note: 'You arrange delivery yourself',
  mk_loc_courier: 'Ready to send by courier',
  mk_phone_title: 'Enter your phone number',
  mk_phone_subtitle: 'Buyers will use it to contact you. You can also use it to sign in.',
  mk_phone_confirm: 'Confirm your phone number',
  mk_phone_send_code: 'Send SMS code',
  mk_phone_authed_note: 'Signed in as',
  mk_promote_title: 'Make your listing stand out',
  mk_promote_skip: 'Skip',
  mk_promote_maxi: 'Maxi card',
  mk_promote_up: 'Bump up',
  mk_promote_premium: 'Premium',
  mk_contacts_title: 'Profile details and contacts',
  mk_contacts_name: 'Name',
  mk_contacts_name_ph: 'Your name',
  mk_contacts_methods: 'Preferred ways to contact you',
  mk_contacts_need_one: 'Choose at least one way for buyers to reach you.',
  mk_contact_chat: 'In-app chat',
  mk_contact_chat_note: 'Enabled by default',
  mk_contact_telegram: 'Telegram',
  mk_contact_call: 'Phone call',
  mk_contact_call_note: 'Buyers will see your phone number',
  mk_seller_contacts: 'Seller contacts',
  mk_contact_chat_libas: 'Chat in LIBΛS',
  mk_contact_via_telegram: 'Contact via Telegram',
  mk_publish_cta: 'Post listing',
  // ── Лента (Feed) ──
  feed_tab: 'Feed',
  feed_title: 'Feed',
  feed_empty: 'No posts yet. Be the first to share an outfit!',
  feed_publish_cta: 'Post to feed',
  feed_publish_short: 'Post',
  feed_pick_sources_title: 'Choose an outfit',
  feed_select_hint: 'Pick one or more to post together',
  feed_add_more: 'Add more',
  feed_refresh: 'Refresh',
  feed_src_library: 'Library',
  feed_lib_add: 'Add photo',
  feed_section_empty: 'Nothing here yet',
  feed_add_tryon_title: 'Add your try-on?',
  feed_add_tryon_body: 'Add a try-on result so people can see the outfit on you, not just the flat lay. It’s optional, but posts with a try-on get more engagement.',
  feed_add_tryon_cta: 'Add a try-on',
  feed_add_tryon_skip: 'Post without it',
  feed_no_sources: 'Nothing to post yet — create an outfit first.',
  feed_next: 'Next',
  feed_caption_placeholder: 'Add a caption… e.g. "office look for summer"',
  feed_caption_label: 'Description',
  feed_compose_title: 'Post outfit',
  feed_compose_subtitle: 'Other members will see it in the feed',
  feed_privacy_notice_flatlay: 'A mannequin flat-lay is posted — without your personal photo.',
  feed_privacy_notice_realphoto: 'This post includes your real try-on photo — everyone will see it.',
  feed_publishing: 'Posting…',
  feed_publish_error: 'Could not post. Please try again.',
  feed_nsfw_blocked: 'This image did not pass moderation.',
  feed_published_title: 'Posted!',
  feed_published_body: 'Your outfit is now in the feed.',
  feed_go_to_feed: 'To feed',
  feed_go_to_profile: 'My profile',
  feed_report: 'Report',
  feed_report_title: 'Report post',
  feed_reason_inappropriate: 'Inappropriate content',
  feed_reason_spam: 'Spam',
  feed_reason_not_fashion: 'Not fashion-related',
  feed_reason_copyright: 'Copyright violation',
  feed_reason_other: 'Other',
  feed_report_message_placeholder: 'Describe the issue (optional)',
  feed_report_submit: 'Submit',
  feed_report_done: 'Thanks, your report was sent.',
  feed_hide_user: "Hide this user's posts",
  feed_hidden_done: "This user's posts are hidden.",
  feed_delete: 'Delete',
  feed_delete_confirm_title: 'Delete post?',
  feed_delete_confirm_body: 'This cannot be undone.',
  feed_cancel: 'Cancel',
  feed_profile_posts: 'Outfits',
  feed_profile_likes: 'Likes',
  feed_profile_followers: 'Followers',
  feed_follow: 'Follow',
  feed_following: 'Following',
  feed_message: 'Message',
  feed_followers_title: 'Followers',
  feed_followers_empty: 'No followers yet',
  feed_profile_following: 'Following',
  feed_following_title: 'Following',
  feed_following_empty: 'Not following anyone yet',
  feed_activity_title: 'Activity',
  feed_tab_liked: 'Liked',
  feed_tab_commented: 'Commented',
  feed_liked_empty: 'No liked posts yet',
  feed_commented_empty: 'No commented posts yet',
  feed_comments_title: 'Comments',
  feed_comments_empty: 'No comments yet',
  feed_view_comments: 'View all {n} comments',
  feed_add_comment_ph: 'Add a comment…',
  feed_comment_send: 'Post',
  feed_edit_profile: 'Edit profile',
  feed_profile_empty: 'No posts yet',
  feed_display_name: 'Name',
  feed_username: 'Username',
  feed_username_taken: 'Taken',
  feed_username_available: 'Available',
  feed_username_required: 'Pick a username to start posting',
  feed_bio: 'Bio',
  feed_save: 'Save',
  feed_avatar: 'Profile photo',
  mk_publish_error: "Couldn't publish. Please try again.",
  mk_published_title: 'Listing under review',
  mk_published_body: "We'll review it and publish it soon. You can find it in My listings.",
  mk_published_view: 'View listing',
  mk_published_back: 'Back to Market',
  mk_detail_characteristics: 'Characteristics',
  mk_detail_description: 'Description',
  mk_detail_location: 'Deal place',
  mk_detail_open_map: 'Open map',
  mk_detail_seller: 'Seller',
  mk_write: 'Message',
  mk_mine_title: 'My listings',
  mk_liked_title: 'Liked',
  mk_liked_empty: 'No liked listings yet',
  mk_mine_drafts: 'Drafts',
  mk_mine_published: 'Published',
  mk_mine_empty: 'You have no listings yet',
  mk_mine_continue: 'Continue',
  mk_mine_delete: 'Delete',
  mk_draft_label: 'Draft',
  mk_chat_compose_ph: 'Hello! Is this still available?',
  mk_chat_send: 'Send',
  mk_chat_title: 'Chat with seller',
  mk_chat_seller_reply: 'Hi! Yes, it is available. When would you like to meet?',
  myOutfits: 'My Outfits',
  tabBoards: 'Boards',
  tabOutfits: 'Outfits',
  tabDressMe: 'Dress Me',
  tabCalendar: 'Calendar',
  noTryOnsYet: 'No try-ons yet',
  noTryOnsHint: 'Your virtual try-on results will appear here.',
  dressMeNeedsItems: 'Add tops, bottoms and footwear to mix and match looks.',
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
  closetCropTitle: 'Add a photo',
  closetCropHint: 'Drag the corners to crop your item. Cropping is optional.',
  closetDetailsTitle: 'Choose details',
  closetDetailsHint: 'Tell us what this item is so it lands in the right section.',
  optSection: 'Section',
  optType: 'Type',
  optSubtype: 'Subtype',
  optLength: 'Length / cut',
  optFit: 'Fit',
  stepChecking: 'Checking image…',
  stepGenerating: 'Generating product image… (~1 min)',
  stepRemovingBg: 'Removing background…',
  stepAnalyzing: 'Analyzing style…',
  stepAlmostDone: 'Almost done…',
  stepProcessing: 'Processing…',
  delete: 'Delete',
  save: 'Save',
  share: 'Share',
  shareToFeed: 'Post to feed',
  shareExternal: 'Share to other apps',
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
  outfitCanvases: 'outfit boards',
  regens: 'outfit generations',
  ruleBasedOutfits: 'rule-based outfits',
  tryOns: 'virtual try-ons',
  calDays: 'days in calendar',
  reachedRegenLimit: "You've used your {n} outfit generations. Upgrade for more.",
  reachedCanvasLimit: 'This outfit board is locked. Your current plan includes {n} board(s). Upgrade to unlock all your boards.',
  reachedTryOnLimit: "You've used all {n} try-ons. Upgrade to try on more outfits.",
  reachedItemLimit: "You've reached your {n}-item wardrobe limit. Upgrade for more.",
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
  continueWithGoogle: 'Continue with Google',
  continueWithApple: 'Continue with Apple',
  signingIn: 'Signing in…',
  socialAuthError: 'Sign-in failed. Please try again.',
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
  // ── Interactive onboarding wizard ──
  ob_skip: 'Skip tour',
  ob_add_any_photo: "Any photo works — even a quick snap. We'll tidy it up for you.",
  ob_beautify_title: 'We cleaned up your photo automatically',
  ob_beautify_subtitle: 'Background removed — only your clothing stays.',
  ob_beautify_before: 'Before',
  ob_beautify_after: 'After',
  ob_beautify_cta: 'Nice →',
  gs_title: 'Add {n} more items to unlock personalized styling',
  gs_progress: '{done} of {total} added',
  gs_cta: 'Add item',
  gs_dismiss: 'Dismiss',
  // ── Closet v2 ──
  cv_hero_title: 'Build your closet',
  cv_hero_subtitle: 'Snap a photo — we name it, cut it out, and file it. All by AI.',
  cv_add_item: 'Add item',
  cv_add_title: 'Add to closet',
  cv_add_reassure: "Any photo works. We clean it up, name it, and sort every item into your closet.",
  cv_build_title: 'Add a top and a bottom',
  cv_build_subtitle: 'Add a top and a bottom — or a dress and shoes — to unlock your personalized styling.',
  cv_build_top: 'Top',
  cv_build_bottom: 'Bottom',
  cv_build_dress: 'Dress',
  cv_build_shoes: 'Shoes',
  cv_build_adding: 'Adding your items…',
  cv_show_bt_title: 'Snap it, we clean it up',
  cv_show_bt_cap: 'Photograph any item — AI cuts out the background and files it in your closet.',
  cv_show_to_title: 'Try it on',
  cv_show_to_cap: 'See how it looks on you before you wear it.',
  cv_show_to_mannequin: 'See any item on a mannequin',
  cv_show_to_me: 'Or try it on your own photo',
  cv_show_to_covered: 'Modest styling, fully covered',
  cn_title: 'Diamonds',
  cn_have: 'You have {n}',
  cn_need_more: 'Not enough diamonds — top up to continue.',
  cn_do_title: 'What you can do',
  cn_do_upload: 'Add clothing',
  cn_free: 'Free',
  cn_do_outfit: 'Create an outfit',
  cn_do_beautify: 'Beautify',
  cn_do_tryon: 'Try it on',
  cn_pack_title: 'Buy diamonds',
  cn_off: '−{n}%',
  cn_custom: 'Or enter your own amount',
  cn_custom_ph: 'Number of diamonds',
  cn_total: 'Total',
  cn_hint_next: 'Add {n} more for −30%',
  cn_warn: 'Generation results can’t be refunded — every run spends diamonds.',
  cn_survey: 'Sometimes you can earn diamonds by completing surveys.',
  cn_buy: 'Buy {n} diamonds',
  cn_note: 'Diamonds are credited after we verify your payment — usually within a few minutes. We’ll confirm in Telegram.',
  cn_currency: 'UZS',
  cn_tg_msg: 'I want to buy {n} diamonds ({price}). My phone: ',
  cv_proc_removing: 'Removing background… ✂️',
  cv_proc_identifying: 'Identifying category… 🏷️',
  cv_fix_title: 'Help us identify these items',
  cv_fix_subtitle: 'Pick the right category so we can style them.',
  cv_fix_done: 'Done',
  cv_fix_later: 'Fill in later',
  cv_src_gallery: 'Gallery',
  cv_src_gallery_sub: 'Choose from your photos',
  cv_src_camera: 'Camera',
  cv_src_camera_sub: 'Take a new photo',
  cv_shop_title: 'Add from the shop',
  cv_shop_add_n: 'Add {n} to closet',
  cv_shop_hint: 'One tap · no photo',
  cv_shop_search: 'Search the shop…',
  cv_shop_added: 'Added to closet',
  cv_shop_empty: 'No products found',
  cv_rv_adding: 'Adding {n} items…',
  cv_rv_new_items: '{n} new items',
  cv_rv_identifying: 'Identifying…',
  cv_rv_select_all: 'Select all',
  cv_rv_delete: 'Delete',
  cv_rv_beautify_banner: 'Not satisfied with a photo? Improve it with Beautify.',
  cv_rv_confirm: 'Looks good',
  cv_rv_add_to_closet: 'Add to Closet',
  cv_rv_detail_view: 'Detail view',
  cv_rv_add_details: 'Add details',
  cv_rv_complete_hint: 'Set the category for every item to continue',
  cv_rv_tryon: 'Try it on now',
  cv_rv_edit_cat: 'Edit category',
  cv_rv_more: 'More details',
  cv_rv_added_toast: 'Added to your closet',
  cv_rv_rejected: "We couldn't detect clothing in this photo",
  cv_rv_processing: 'Preparing…',
  cv_bt_button: 'Beautify',
  cv_bt_title: 'Which one looks better?',
  cv_bt_subtitle: 'You choose what we keep',
  cv_bt_original: 'Original photo',
  cv_bt_beautified: 'Beautified photo',
  cv_bt_save: 'Save beautified version',
  cv_bt_keep: 'Keep original photo',
  cv_bt_working: 'Beautifying…',
  cv_bt_ready: 'Beautified version ready — tap to compare',
  cv_bt_failed: "Beautify didn't work — try again",
  cv_bt_soon: 'Beautify is coming soon',
  cv_dt_original: 'Original',
  cv_dt_beautified: 'Beautified',
  cv_dt_color: 'Colour',
  cv_dt_season: 'Season',
  cv_dt_material: 'Material',
  cv_dt_pattern: 'Pattern',
  cv_dt_style: 'Style',
  cv_dt_worn: 'Worn {n} times',
  cv_dt_worn_never: 'Not worn yet',
  cv_dt_mark_worn: 'Mark worn',
  cv_dt_tryon: 'Try on',
  cv_dt_name_placeholder: 'Name this item',
  cv_bt_intro_title: 'Meet Beautify',
  cv_bt_intro_body: "Beautify turns your photo into a clean studio product shot. We'll create an enhanced version — you choose whether to keep it.",
  cv_bt_intro_cta: 'Got it',
  cv_bt_auto_kicker: 'Introducing Beautify',
  cv_bt_auto_headline: "We'll clean up your photos automatically",
  cv_bt_intro_caption: 'Beautify removes the background and turns your photo into a clean product shot.',
  cv_bt_intro_do: 'Beautify my photo',
  cv_bt_intro_skip: 'Maybe later',
  cv_bt_intro_skip_add: 'Add without beautifying',
  cv_bt_never: "Don't show this again",
  cv_bt_per_photo: 'per photo',
  ob_welcome_title: 'Welcome to Libas AI',
  ob_welcome_body: "Let's create your first outfit in just a minute. Follow along — we'll guide you through every step.",
  ob_welcome_cta: 'Get started',
  ob_add_upper_title: 'Add your first item',
  ob_add_upper_body: 'Take a photo or upload a top, jacket, or dress. The app removes the background for you — only the clothing stays.',
  ob_add_lower_title: 'Add the bottom',
  ob_add_lower_body: 'Now add jeans, a skirt, or pants — your first outfit is almost ready!',
  ob_add_shoes_title: 'Add some shoes',
  ob_add_shoes_body: 'Add sneakers, heels, or boots to finish your look — your first AI outfit is almost ready.',
  ob_add_pick_photo: 'Choose from gallery',
  ob_add_take_photo: 'Take a photo',
  ob_add_choose_category: 'Choose a category',
  ob_add_save: 'Add to closet',
  ob_add_change_photo: 'Change photo',
  ob_add_processing: 'Processing your item…',
  ob_dress_skip_toast: 'A dress is a full look — now add some shoes!',
  ob_generate_title: 'Put it together',
  ob_generate_body: 'Tap the button and the app combines your items into one stylish outfit.',
  ob_generate_cta: 'Create outfit',
  ob_generating: 'Styling your look…',
  ob_generate_again: 'Try another',
  ob_generate_continue: 'Looks great →',
  ob_edit_title: 'Make it yours',
  ob_edit_body: 'Drag the items with your finger and arrange them your way. Save when you like it.',
  ob_edit_cta: 'Save',
  ob_edit_open: 'Open editor',
  ob_tryon_title: 'Try it on',
  ob_tryon_body: 'See how the outfit looks on you. It takes about a minute.',
  ob_tryon_cta: 'Try it on',
  ob_tryon_quota_note: 'You can run a virtual try-on anytime from your closet.',
  ob_tryon_continue: 'Finish →',
  ob_done_title: "You're all set! ✨",
  ob_done_body: 'Your closet is ready. Add more items, generate outfits and try them on anytime.',
  ob_done_cta: 'Go to my closet',
  tryOnConfirmTitle: 'Try It On?',
  tryOnConfirmBody: 'See how this outfit looks on you',
  tryOnCancel: 'Cancel',
  tryOnConfirm: 'Try It On',
  tryOnTargetMannequin: 'On a mannequin',
  tryOnTargetMannequinHint: 'Classic studio look on a model',
  tryOnTargetSelf: 'On my photo',
  tryOnTargetSelfHint: 'Upload a photo — we dress it in this outfit',
  tryOnUploadPhoto: 'Upload photo',
  tryOnChangePhoto: 'Change photo',
  tryOnPhotoHint: 'Full-length photo, good lighting, facing the camera',
  tryOnUploading: 'Uploading…',
  tryOnPhotoFailed: 'Upload failed. Try another photo.',
  tryOnPhotoWhatTitle: 'What photo should you upload?',
  tryOnPhotoWhatBody: 'For the best results, upload a full-body photo of only yourself standing against a plain (preferably white) or clean background. Make sure your full body is visible and your outfit is not covered.',
  tryOnDeleteTitle: 'Delete this look?',
  tryOnDeleteBody: "This can't be undone.",
  tryOnDeleteFailed: 'Failed to delete. Please try again.',
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
  tryOnFailedSafety:
    "This photo couldn't be used — it didn't pass our content safety checks. Please try a different photo or outfit.",
  tryOnFailedTimeout:
    'This is taking longer than expected. Please try again in a moment.',
  tryOnFailedGeneric: "We couldn't create your try-on. Please try again.",
  close: 'Close',
  retry: 'Retry',
  loadMore: 'Load more',
  myLooks: 'My Looks',
  myLooksSaved: 'saved',
  myLooksEmpty: 'No saved looks yet',
  myLooksEmptyHint: 'Generate a try-on look and it will appear here automatically',
  myLooksSaveLook: 'Save Look',
  justNow: 'Just now',
  minutesAgo: '{n}m ago',
  yesterday: 'Yesterday',
  feedbackBannerTitle: 'Help us improve LIBΛS 💬',
  feedbackBannerBody: 'Share your feedback or report an issue — chat directly with our team.',
  feedbackBannerCta: 'Send feedback',
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
  canvasDemoIntro: 'You can move any item',
  canvasDemoSwap: 'Just drag to rearrange ✨',
  canvasDemoDone: 'Now try it yourself!',
  profile: 'Profile',
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
  generateOutfitLabel: 'Generate outfit',
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
  categoryLabels: {
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
  marketTitle: 'Маркет',
  closetTitle: 'Гардероб',
  marketComingSoonTitle: 'Скоро',
  marketComingSoonText: 'Скоро здесь вы сможете продавать свои вещи',
  // ── Market (C2C) ──
  mk_post_cta: 'Поставить объявление',
  mk_sell_short: 'Продать',
  mk_my_listings: 'Мои объявления',
  mk_empty_feed: 'Пока нет объявлений',
  mk_categories: 'Категории',
  mk_all_categories: 'Все категории',
  mk_search_placeholder: 'Поиск объявлений',
  mk_visual_search: 'Визуальный поиск',
  mk_banner_sell_title: 'Продавайте быстрее',
  mk_banner_sell_sub: 'Разместите объявление за пару минут',
  mk_banner_contact_title: 'Свяжитесь с нами',
  mk_banner_contact_sub: 'Вопросы или отзывы? Напишите нашей команде',
  mk_free:'Даром',
  mk_negotiable: 'Торг уместен',
  mk_courier_available: 'Доставка курьером',
  mk_intro_title: 'Как публиковать объявления?',
  mk_intro_subtitle: '3 простых шага',
  mk_intro_step1: 'Название и 3–4 фото',
  mk_intro_step2: 'Цена и все детали',
  mk_intro_step3: 'Контакты и место сделки',
  mk_intro_done: 'Объявление уже в ленте',
  mk_save_exit: 'Сохранить и выйти',
  mk_apply: 'Применить',
  mk_continue: 'Продолжить',
  mk_details_title: 'Расскажите о товаре',
  mk_status_review: 'На проверке',
  mk_status_active: 'Активно',
  mk_status_sold: 'Продано',
  mk_status_archived: 'В архиве',
  mk_status_rejected: 'Отклонено',
  mk_manage_title: 'Управление',
  mk_manage_edit: 'Редактировать',
  mk_manage_edit_resubmit: 'Изменить и отправить на проверку',
  mk_manage_mark_active: 'Сделать активным',
  mk_manage_mark_sold: 'Отметить проданным',
  mk_manage_archive: 'В архив',
  mk_manage_status: 'Изменить статус',
  mk_status_locked_note: 'Объявление на проверке. Изменить статус можно будет после одобрения.',
  mk_status_confirm_title: 'Изменить статус?',
  mk_status_confirm_body: 'Отметить объявление как «{status}»?',
  mk_cancel: 'Отмена',
  mk_delete_confirm_title: 'Удалить объявление?',
  mk_delete_confirm_body: 'Это действие нельзя отменить.',
  mk_rejected_note: 'Объявление отклонено. Измените его и отправьте на повторную проверку.',
  mk_pending_note: 'Объявление на проверке — пока его можно изменить или удалить.',
  mk_updated_title: 'Изменения сохранены',
  mk_updated_body: 'Ваше объявление обновлено.',
  mk_resubmit_title: 'Отправлено на проверку',
  mk_resubmit_body: 'Мы проверим изменения и скоро опубликуем.',
  mk_save_changes: 'Сохранить',
  mk_photos_title: 'Добавьте фото объявления',
  mk_photos_hint: 'Можно добавить от 1 до 10 фото. Фото должно быть меньше 10 МБ и с разрешением не ниже 300×300.',
  mk_photos_tips_title: 'Как сделать идеальное фото?',
  mk_photos_tips_cta: 'Смотреть советы',
  mk_photos_from_gallery: 'Из галереи',
  mk_photos_from_camera: 'Камера',
  mk_photos_min_error: 'Фото должно быть не меньше 300×300',
  mk_photos_size_error: 'Фото должно быть меньше 10 МБ',
  mk_photos_max_error: 'Можно добавить до 10 фото',
  mk_crop_title: 'Обрежьте фото',
  mk_title_title: 'Введите название объявления',
  mk_title_placeholder: 'Например, Юбка Polo',
  mk_category_title: 'Выберите категорию',
  mk_category_suggested: 'Подобрали для вас',
  mk_category_other: 'Другая категория',
  mk_char_title: 'Укажите характеристики',
  mk_char_condition: 'Состояние',
  mk_char_brand: 'Бренд',
  mk_brand_none: 'Без бренда',
  mk_brand_other: 'Другая марка',
  mk_brand_custom_ph: 'Введите название бренда',
  mk_size_one: 'Один размер',
  mk_char_size: 'Размер',
  mk_char_season: 'Сезон',
  mk_char_length: 'Длина изделия',
  mk_char_color: 'Цвет',
  mk_char_select: 'Выберите значение',
  mk_char_modesty: 'Подходит для покрытых',
  mk_char_fit: 'Посадка',
  mk_char_material: 'Материал',
  mk_char_country: 'Страна-производитель',
  mk_search: 'Поиск',
  mk_char_yes: 'Да',
  mk_char_no: 'Нет',
  mk_cond_used_good: 'Б/у (отличное, как новое)',
  mk_cond_used_visible: 'Б/у (есть следы носки)',
  mk_cond_used_defects: 'Б/у (есть заметные дефекты)',
  mk_cond_new_with_tag: 'Новое (с биркой, в упаковке)',
  mk_season_demi: 'Демисезон',
  mk_season_winter: 'Зима',
  mk_season_summer: 'Лето',
  mk_season_all: 'На все сезоны',
  mk_length_maxi: 'Макси',
  mk_length_midi: 'Миди',
  mk_length_mini: 'Мини',
  mk_color_black: 'Чёрный',
  mk_color_white: 'Белый',
  mk_color_beige: 'Бежевый',
  mk_color_gray: 'Серый',
  mk_color_blue: 'Синий',
  mk_color_lightblue: 'Голубой',
  mk_color_red: 'Красный',
  mk_color_green: 'Зелёный',
  mk_color_yellow: 'Жёлтый',
  mk_color_pink: 'Розовый',
  mk_color_brown: 'Коричневый',
  mk_color_purple: 'Фиолетовый',
  mk_color_orange: 'Оранжевый',
  mk_color_multicolor: 'Разноцветный',
  mk_deal_title: 'Укажите условия сделки',
  mk_deal_conditions: 'Условия',
  mk_deal_sell: 'Указать цену',
  mk_deal_free: 'Отдам даром',
  mk_deal_price: 'Стоимость',
  mk_currency_uzs: 'Сум',
  mk_currency_usd: 'у.е.',
  mk_deal_urgent: 'Продам срочно. Торг',
  mk_desc_title: 'Добавьте описание',
  mk_desc_placeholder: 'Опишите товар: материал, особенности, причину продажи',
  mk_loc_title: 'Укажите место встречи с покупателем',
  mk_loc_region_label: 'Регион',
  mk_loc_district_label: 'Район',
  mk_loc_district_ph: 'Выберите район',
  mk_loc_search: 'Адрес, магазин или метро',
  mk_loc_map: 'Указать на карте',
  mk_loc_map_change: 'Изменить место на карте',
  mk_loc_pick_title: 'Выберите место',
  mk_loc_pick_hint: 'Двигайте карту, чтобы метка указывала на нужное место.',
  mk_loc_map_confirm: 'Подтвердить место',
  mk_loc_use_current: 'Моё местоположение',
  mk_loc_map_error: 'Не удалось загрузить карту. Проверьте соединение.',
  mk_loc_pinned: 'Место выбрано',
  mk_photos_add: 'Добавить фото',
  mk_photos_over_cap: 'Сохранятся первые {n} фото (демо без бэкенда).',
  mk_no_image: 'Нет фото',
  mk_category_choose: 'Выбрать категорию',
  mk_contact_tg_note: 'Укажите свой Telegram username, чтобы покупатели могли написать вам в Telegram.',
  mk_contact_tg_username_ph: 'username',
  mk_loc_landmark_label: 'Укажите ориентир',
  mk_loc_landmark_ph: 'Например, алайский рынок',
  mk_loc_courier_note: 'Вы самостоятельно организовываете доставку',
  mk_loc_courier: 'Готов отправить курьером',
  mk_phone_title: 'Укажите номер телефона',
  mk_phone_subtitle: 'По нему покупатели смогут связаться с вами. Вы также сможете использовать его для авторизации.',
  mk_phone_confirm: 'Подтвердите номер телефона',
  mk_phone_send_code: 'Отправить СМС код',
  mk_phone_authed_note: 'Вы вошли как',
  mk_promote_title: 'Сделайте объявление заметнее',
  mk_promote_skip: 'Пропустить',
  mk_promote_maxi: 'Макси карточка',
  mk_promote_up: 'Вверх',
  mk_promote_premium: 'Премиум',
  mk_contacts_title: 'Данные профиля и контакты для связи',
  mk_contacts_name: 'Имя',
  mk_contacts_name_ph: 'Ваше имя',
  mk_contacts_methods: 'Предпочтительные способы связи с вами',
  mk_contacts_need_one: 'Выберите хотя бы один способ связи с вами.',
  mk_contact_chat: 'Чат в приложении',
  mk_contact_chat_note: 'Включён по умолчанию',
  mk_contact_telegram: 'Telegram',
  mk_contact_call: 'Звонок по телефону',
  mk_contact_call_note: 'Покупатели увидят ваш номер',
  mk_seller_contacts: 'Контакты продавца',
  mk_contact_chat_libas: 'Чат внутри LIBΛS',
  mk_contact_via_telegram: 'Связаться по Telegram',
  mk_publish_cta: 'Поставить объявление',
  // ── Лента (Feed) ──
  feed_tab: 'Лента',
  feed_title: 'Лента',
  feed_empty: 'Пока нет публикаций. Поделитесь образом первым!',
  feed_publish_cta: 'Опубликовать в ленту',
  feed_publish_short: 'Опубликовать',
  feed_pick_sources_title: 'Выберите образ',
  feed_select_hint: 'Выберите один или несколько, чтобы опубликовать вместе',
  feed_add_more: 'Добавить ещё',
  feed_refresh: 'Обновить',
  feed_src_library: 'Галерея',
  feed_lib_add: 'Добавить фото',
  feed_section_empty: 'Здесь пока пусто',
  feed_add_tryon_title: 'Добавить примерку?',
  feed_add_tryon_body: 'Добавьте результат примерки, чтобы было видно образ на вас, а не только раскладку. Это необязательно, но посты с примеркой набирают больше откликов.',
  feed_add_tryon_cta: 'Добавить примерку',
  feed_add_tryon_skip: 'Опубликовать без неё',
  feed_no_sources: 'Пока нечего публиковать — сначала создайте образ.',
  feed_next: 'Далее',
  feed_caption_placeholder: 'Добавьте подпись… напр. «деловой образ на лето»',
  feed_caption_label: 'Описание',
  feed_compose_title: 'Опубликовать образ',
  feed_compose_subtitle: 'Его увидят другие участники ленты',
  feed_privacy_notice_flatlay: 'Публикуется образ на манекене — без вашего личного фото.',
  feed_privacy_notice_realphoto: 'В посте есть ваше реальное фото из примерки — его увидят все.',
  feed_publishing: 'Публикуем…',
  feed_publish_error: 'Не удалось опубликовать. Попробуйте ещё раз.',
  feed_nsfw_blocked: 'Изображение не прошло модерацию.',
  feed_published_title: 'Опубликовано!',
  feed_published_body: 'Ваш образ теперь в ленте.',
  feed_go_to_feed: 'В ленту',
  feed_go_to_profile: 'Мой профиль',
  feed_report: 'Пожаловаться',
  feed_report_title: 'Пожаловаться на пост',
  feed_reason_inappropriate: 'Непристойный контент',
  feed_reason_spam: 'Спам',
  feed_reason_not_fashion: 'Не относится к моде',
  feed_reason_copyright: 'Нарушение авторских прав',
  feed_reason_other: 'Другое',
  feed_report_message_placeholder: 'Опишите проблему (необязательно)',
  feed_report_submit: 'Отправить',
  feed_report_done: 'Спасибо, жалоба отправлена.',
  feed_hide_user: 'Скрыть посты пользователя',
  feed_hidden_done: 'Посты пользователя скрыты.',
  feed_delete: 'Удалить',
  feed_delete_confirm_title: 'Удалить публикацию?',
  feed_delete_confirm_body: 'Это действие нельзя отменить.',
  feed_cancel: 'Отмена',
  feed_profile_posts: 'Образов',
  feed_profile_likes: 'Лайков',
  feed_profile_followers: 'Подписчиков',
  feed_follow: 'Подписаться',
  feed_following: 'Вы подписаны',
  feed_message: 'Написать',
  feed_followers_title: 'Подписчики',
  feed_followers_empty: 'Пока нет подписчиков',
  feed_profile_following: 'Подписки',
  feed_following_title: 'Подписки',
  feed_following_empty: 'Пока ни на кого не подписаны',
  feed_activity_title: 'Активность',
  feed_tab_liked: 'Лайки',
  feed_tab_commented: 'Комментарии',
  feed_liked_empty: 'Пока нет лайков',
  feed_commented_empty: 'Пока нет комментариев',
  feed_comments_title: 'Комментарии',
  feed_comments_empty: 'Пока нет комментариев',
  feed_view_comments: 'Смотреть все комментарии ({n})',
  feed_add_comment_ph: 'Добавьте комментарий…',
  feed_comment_send: 'Отпр.',
  feed_edit_profile: 'Редактировать профиль',
  feed_profile_empty: 'Пока нет публикаций',
  feed_display_name: 'Имя',
  feed_username: 'Имя пользователя',
  feed_username_taken: 'Занято',
  feed_username_available: 'Свободно',
  feed_username_required: 'Придумайте имя пользователя, чтобы публиковать',
  feed_bio: 'О себе',
  feed_save: 'Сохранить',
  feed_avatar: 'Фото профиля',
  mk_publish_error: 'Не удалось опубликовать. Попробуйте ещё раз.',
  mk_published_title: 'Объявление на проверке',
  mk_published_body: 'Мы проверим его и скоро опубликуем. Объявление доступно в разделе «Мои объявления».',
  mk_published_view: 'Посмотреть объявление',
  mk_published_back: 'Вернуться в Маркет',
  mk_detail_characteristics: 'Характеристики',
  mk_detail_description: 'Описание',
  mk_detail_location: 'Место сделки',
  mk_detail_open_map: 'Открыть карту',
  mk_detail_seller: 'Продавец',
  mk_write: 'Написать',
  mk_mine_title: 'Мои объявления',
  mk_liked_title: 'Избранное',
  mk_liked_empty: 'Пока нет избранных объявлений',
  mk_mine_drafts: 'Черновики',
  mk_mine_published: 'Опубликованные',
  mk_mine_empty: 'У вас пока нет объявлений',
  mk_mine_continue: 'Продолжить',
  mk_mine_delete: 'Удалить',
  mk_draft_label: 'Черновик',
  mk_chat_compose_ph: 'Здравствуйте! Ещё актуально?',
  mk_chat_send: 'Отправить',
  mk_chat_title: 'Чат с продавцом',
  mk_chat_seller_reply: 'Здравствуйте! Да, актуально. Когда вам удобно встретиться?',
  myOutfits: 'Мои образы',
  tabBoards: 'Доски',
  tabOutfits: 'Образы',
  tabDressMe: 'Примерочная',
  tabCalendar: 'Календарь',
  noTryOnsYet: 'Примерок пока нет',
  noTryOnsHint: 'Здесь появятся результаты виртуальной примерки.',
  dressMeNeedsItems: 'Добавьте верх, низ и обувь, чтобы собирать образы.',
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
  closetCropTitle: 'Добавьте фото',
  closetCropHint: 'Потяните за углы, чтобы обрезать вещь. Обрезка необязательна.',
  closetDetailsTitle: 'Выберите детали',
  closetDetailsHint: 'Укажите, что это за вещь, чтобы она попала в нужный раздел.',
  optSection: 'Раздел',
  optType: 'Тип вещи',
  optSubtype: 'Подкатегория',
  optLength: 'Длина / крой',
  optFit: 'Посадка',
  stepChecking: 'Проверка изображения…',
  stepGenerating: 'Генерация изображения… (~1 мин)',
  stepRemovingBg: 'Удаление фона…',
  stepAnalyzing: 'Анализ стиля…',
  stepAlmostDone: 'Почти готово…',
  stepProcessing: 'Обработка…',
  delete: 'Удалить',
  save: 'Сохранить',
  share: 'Поделиться',
  shareToFeed: 'Опубликовать в ленту',
  shareExternal: 'Поделиться в другие приложения',
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
  outfitCanvases: 'досок образов',
  regens: 'генераций образов',
  ruleBasedOutfits: 'образы по правилам',
  tryOns: 'примерок',
  calDays: 'дней в календаре',
  reachedRegenLimit: 'Вы использовали {n} генераций образов. Улучшите план для большего.',
  reachedCanvasLimit: 'Эта доска нарядов заблокирована. Ваш текущий план включает {n} досок(у). Обновите план, чтобы разблокировать все.',
  reachedTryOnLimit: 'Вы использовали все {n} примерок. Улучшите план, чтобы примерять больше образов.',
  reachedItemLimit: 'Достигнут лимит гардероба — {n} вещей. Улучшите план для большего.',
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
  continueWithGoogle: 'Продолжить с Google',
  continueWithApple: 'Продолжить с Apple',
  signingIn: 'Вход…',
  socialAuthError: 'Не удалось войти. Попробуйте снова.',
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
  // ── Interactive onboarding wizard ──
  ob_skip: 'Пропустить',
  ob_add_any_photo: 'Подойдёт любое фото — даже быстрый снимок. Мы всё аккуратно обработаем.',
  ob_beautify_title: 'Мы автоматически очистили ваше фото',
  ob_beautify_subtitle: 'Фон удалён — осталась только одежда.',
  ob_beautify_before: 'До',
  ob_beautify_after: 'После',
  ob_beautify_cta: 'Отлично →',
  gs_title: 'Добавьте ещё {n} вещей, чтобы открыть персональный стиль',
  gs_progress: '{done} из {total} добавлено',
  gs_cta: 'Добавить',
  gs_dismiss: 'Скрыть',
  // ── Closet v2 ──
  cv_hero_title: 'Соберите гардероб',
  cv_hero_subtitle: 'Сфотографируйте — мы назовём, вырежем фон и разложим. Всё за счёт ИИ.',
  cv_add_item: 'Добавить',
  cv_add_title: 'Добавить в гардероб',
  cv_build_title: 'Добавьте верх и низ',
  cv_build_subtitle: 'Добавьте верх и низ — или платье и обувь — чтобы открыть персональный стиль.',
  cv_build_top: 'Верх',
  cv_build_bottom: 'Низ',
  cv_build_dress: 'Платье',
  cv_build_shoes: 'Обувь',
  cv_build_adding: 'Добавляем вещи…',
  cv_show_bt_title: 'Сфотографируйте — мы очистим',
  cv_show_bt_cap: 'Снимите любую вещь — ИИ уберёт фон и добавит её в гардероб.',
  cv_show_to_title: 'Примерка',
  cv_show_to_cap: 'Посмотрите, как вещь смотрится на вас, до того как наденете.',
  cv_show_to_mannequin: 'Примерьте на манекене',
  cv_show_to_me: 'Или на своём фото',
  cv_show_to_covered: 'Скромный образ, полностью закрыто',
  cn_title: 'Монеты',
  cn_have: 'У вас {n}',
  cn_need_more: 'Недостаточно монет — пополните, чтобы продолжить.',
  cn_do_title: 'Что можно делать',
  cn_do_upload: 'Добавить одежду',
  cn_free: 'Бесплатно',
  cn_do_outfit: 'Создать образ',
  cn_do_beautify: 'Beautify',
  cn_do_tryon: 'Примерить',
  cn_pack_title: 'Купить монеты',
  cn_off: '−{n}%',
  cn_custom: 'Или введите своё количество',
  cn_custom_ph: 'Количество монет',
  cn_total: 'Итого',
  cn_hint_next: 'Добавьте ещё {n} и получите −30%',
  cn_warn: 'Результат генерации не возвращается — каждый запуск списывает монеты.',
  cn_survey: 'Иногда монеты можно получить за прохождение опросов.',
  cn_buy: 'Купить {n} монет',
  cn_note: 'Монеты зачислим сразу после проверки платежа — обычно за несколько минут. Подтвердим в Telegram.',
  cn_currency: 'сум',
  cn_tg_msg: 'Хочу купить {n} монет ({price}). Мой номер: ',
  cv_proc_removing: 'Удаление фона… ✂️',
  cv_proc_identifying: 'Определяем категорию… 🏷️',
  cv_fix_title: 'Помогите определить эти вещи',
  cv_fix_subtitle: 'Выберите правильную категорию, чтобы мы могли их стилизовать.',
  cv_fix_done: 'Готово',
  cv_fix_later: 'Заполнить позже',
  cv_add_reassure: 'Подойдёт любое фото. Мы обработаем его, дадим название и разложим по гардеробу.',
  cv_src_gallery: 'Галерея',
  cv_src_gallery_sub: 'Выберите из своих фото',
  cv_src_camera: 'Камера',
  cv_src_camera_sub: 'Сделать новое фото',
  cv_shop_title: 'Добавить из магазина',
  cv_shop_add_n: 'Добавить {n} в гардероб',
  cv_shop_hint: 'В один тап · без фото',
  cv_shop_search: 'Поиск по магазину…',
  cv_shop_added: 'Добавлено в гардероб',
  cv_shop_empty: 'Товары не найдены',
  cv_rv_adding: 'Добавляем {n} вещей…',
  cv_rv_new_items: '{n} новых вещей',
  cv_rv_identifying: 'Распознаём…',
  cv_rv_select_all: 'Выбрать все',
  cv_rv_delete: 'Удалить',
  cv_rv_beautify_banner: 'Не нравится фото? Улучшите его с Beautify.',
  cv_rv_confirm: 'Готово',
  cv_rv_add_to_closet: 'Добавить в гардероб',
  cv_rv_detail_view: 'Подробно',
  cv_rv_add_details: 'Добавьте детали',
  cv_rv_complete_hint: 'Укажите категорию для каждой вещи, чтобы продолжить',
  cv_rv_tryon: 'Примерить сейчас',
  cv_rv_edit_cat: 'Изменить категорию',
  cv_rv_more: 'Подробнее',
  cv_rv_added_toast: 'Добавлено в гардероб',
  cv_rv_rejected: 'Не удалось распознать одежду на этом фото',
  cv_rv_processing: 'Готовим…',
  cv_bt_button: 'Beautify',
  cv_bt_title: 'Какой вариант лучше?',
  cv_bt_subtitle: 'Вы выбираете, что оставить',
  cv_bt_original: 'Оригинал',
  cv_bt_beautified: 'Улучшенное фото',
  cv_bt_save: 'Сохранить улучшенное',
  cv_bt_keep: 'Оставить оригинал',
  cv_bt_working: 'Улучшаем…',
  cv_bt_ready: 'Улучшенное фото готово — нажмите, чтобы сравнить',
  cv_bt_failed: 'Не получилось — попробуйте ещё раз',
  cv_bt_soon: 'Beautify скоро появится',
  cv_dt_original: 'Оригинал',
  cv_dt_beautified: 'Улучшенное',
  cv_dt_color: 'Цвет',
  cv_dt_season: 'Сезон',
  cv_dt_material: 'Материал',
  cv_dt_pattern: 'Узор',
  cv_dt_style: 'Стиль',
  cv_dt_worn: 'Носили {n} раз',
  cv_dt_worn_never: 'Ещё не носили',
  cv_dt_mark_worn: 'Отметить',
  cv_dt_tryon: 'Примерить',
  cv_dt_name_placeholder: 'Название вещи',
  cv_bt_intro_title: 'Знакомьтесь — Beautify',
  cv_bt_intro_body: 'Beautify превращает фото в аккуратный студийный снимок. Мы сделаем улучшенную версию — вы решаете, оставить её или нет.',
  cv_bt_intro_cta: 'Понятно',
  cv_bt_auto_kicker: 'Знакомьтесь — Beautify',
  cv_bt_auto_headline: 'Мы автоматически улучшим ваши фото',
  cv_bt_intro_caption: 'Beautify убирает фон и превращает фото в аккуратный продуктовый снимок.',
  cv_bt_intro_do: 'Улучшить моё фото',
  cv_bt_intro_skip: 'Позже',
  cv_bt_intro_skip_add: 'Добавить без улучшения',
  cv_bt_never: 'Больше не показывать',
  cv_bt_per_photo: 'за фото',
  ob_welcome_title: 'Добро пожаловать в Libas AI',
  ob_welcome_body: 'Соберём ваш первый образ всего за минуту. Просто следуйте подсказкам — покажем каждый шаг.',
  ob_welcome_cta: 'Начать',
  ob_add_upper_title: 'Добавьте первую вещь',
  ob_add_upper_body: 'Сфотографируйте или загрузите футболку, жакет или платье. Приложение само уберёт фон — останется только одежда.',
  ob_add_lower_title: 'Добавьте низ',
  ob_add_lower_body: 'Теперь джинсы, юбку или брюки — и ваш первый образ почти готов!',
  ob_add_shoes_title: 'Добавьте обувь',
  ob_add_shoes_body: 'Добавьте кроссовки, каблуки или ботинки — и ваш первый образ почти готов.',
  ob_add_pick_photo: 'Выбрать из галереи',
  ob_add_take_photo: 'Сделать фото',
  ob_add_choose_category: 'Выберите категорию',
  ob_add_save: 'Добавить в гардероб',
  ob_add_change_photo: 'Изменить фото',
  ob_add_processing: 'Обрабатываем вещь…',
  ob_dress_skip_toast: 'Платье — это готовый образ. Теперь добавьте обувь!',
  ob_generate_title: 'Соберите образ',
  ob_generate_body: 'Нажмите кнопку — приложение красиво соединит ваши вещи в один образ.',
  ob_generate_cta: 'Собрать образ',
  ob_generating: 'Подбираем образ…',
  ob_generate_again: 'Ещё вариант',
  ob_generate_continue: 'Отлично →',
  ob_edit_title: 'Расставьте, как нравится',
  ob_edit_body: 'Двигайте вещи пальцем и располагайте их по-своему. Когда понравится — сохраните.',
  ob_edit_cta: 'Сохранить',
  ob_edit_open: 'Открыть редактор',
  ob_tryon_title: 'Примерьте на себе',
  ob_tryon_body: 'Посмотрите, как образ смотрится именно на вас. Это займёт около минуты.',
  ob_tryon_cta: 'Примерить',
  ob_tryon_quota_note: 'Виртуальную примерку можно запустить в любой момент из гардероба.',
  ob_tryon_continue: 'Завершить →',
  ob_done_title: 'Всё готово! ✨',
  ob_done_body: 'Ваш гардероб готов. Добавляйте вещи, создавайте образы и примеряйте их в любое время.',
  ob_done_cta: 'В мой гардероб',
  tryOnConfirmTitle: 'Примерить?',
  tryOnConfirmBody: 'Посмотрите, как наряд смотрится на вас',
  tryOnCancel: 'Отмена',
  tryOnConfirm: 'Примерить',
  tryOnTargetMannequin: 'На манекен',
  tryOnTargetMannequinHint: 'Классический показ на модели',
  tryOnTargetSelf: 'На своё фото',
  tryOnTargetSelfHint: 'Загрузите фото — оденем наряд на вас',
  tryOnUploadPhoto: 'Загрузить фото',
  tryOnChangePhoto: 'Изменить фото',
  tryOnPhotoHint: 'Фото в полный рост, хорошее освещение, лицом к камере',
  tryOnUploading: 'Загрузка…',
  tryOnPhotoFailed: 'Не удалось загрузить. Попробуйте другое фото.',
  tryOnPhotoWhatTitle: 'Какое фото загрузить?',
  tryOnPhotoWhatBody: 'Для лучшего результата загрузите фото в полный рост, где вы стоите одна на однотонном (желательно белом) или чистом фоне. Не обрезайте ноги и не закрывайте одежду или фигуру.',
  tryOnDeleteTitle: 'Удалить этот образ?',
  tryOnDeleteBody: 'Это действие нельзя отменить.',
  tryOnDeleteFailed: 'Не удалось удалить. Попробуйте снова.',
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
  tryOnFailedSafety:
    'Это фото не подошло — оно не прошло проверку безопасности контента. Попробуйте другое фото или образ.',
  tryOnFailedTimeout:
    'Это занимает больше времени, чем обычно. Пожалуйста, попробуйте ещё раз через минуту.',
  tryOnFailedGeneric:
    'Не удалось создать примерку. Пожалуйста, попробуйте ещё раз.',
  close: 'Закрыть',
  retry: 'Повторить',
  loadMore: 'Показать ещё',
  myLooks: 'Мои образы',
  myLooksSaved: 'сохранено',
  myLooksEmpty: 'Нет сохранённых образов',
  myLooksEmptyHint: 'Создайте образ примерки — он появится здесь автоматически',
  myLooksSaveLook: 'Сохранить образ',
  justNow: 'Только что',
  minutesAgo: '{n} мин назад',
  yesterday: 'Вчера',
  feedbackBannerTitle: 'Помогите улучшить LIBΛS 💬',
  feedbackBannerBody: 'Поделитесь отзывом или сообщите о проблеме — напишите нашей команде напрямую.',
  feedbackBannerCta: 'Оставить отзыв',
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
  canvasDemoIntro: 'Любую вещь можно перемещать',
  canvasDemoSwap: 'Просто перетащите ✨',
  canvasDemoDone: 'Теперь попробуйте сами!',
  profile: 'Профиль',
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
  generateOutfitLabel: 'Генерировать образ',
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
  categoryLabels: {
    tops: 'Топы',
    tshirts: 'Футболки',
    blouses: 'Блузки',
    dresses: 'Платья',
    jumpsuits: 'Комбинезоны',
    jackets: 'Жакеты',
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
    shawl: 'Шаль',
    jewelry: 'Украшения',
    underwear: 'Нижнее бельё',
  },
};

const uz: Translations = {
  today: 'Bugun',
  weekend: 'Dam olish',
  nextSevenDays: 'Keyingi 7 kun',
  marketTitle: 'Bozor',
  closetTitle: 'Garderob',
  marketComingSoonTitle: 'Tez orada',
  marketComingSoonText: "Tez orada, bu yerda siz o'z buyumlaringizni sotishingiz mumkin",
  // ── Market (C2C) ──
  mk_post_cta: "E'lon joylash",
  mk_sell_short: 'Sotish',
  mk_my_listings: "Mening e'lonlarim",
  mk_empty_feed: "Hozircha e'lonlar yo'q",
  mk_categories: 'Kategoriyalar',
  mk_all_categories: 'Barcha kategoriyalar',
  mk_search_placeholder: "E'lonlarni qidirish",
  mk_visual_search: 'Vizual qidiruv',
  mk_banner_sell_title: 'Tezroq soting',
  mk_banner_sell_sub: "E'loningizni bir necha daqiqada joylang",
  mk_banner_contact_title: "Biz bilan bog'laning",
  mk_banner_contact_sub: 'Savol yoki fikr bormi? Jamoamizga yozing',
  mk_free: 'Tekin',
  mk_negotiable: 'Savdolashish mumkin',
  mk_courier_available: 'Kuryer yetkazib berish',
  mk_intro_title: "E'lonlarni qanday joylash mumkin?",
  mk_intro_subtitle: '3 oddiy qadam',
  mk_intro_step1: 'Nomi va 3–4 ta rasm',
  mk_intro_step2: 'Narxi va barcha tafsilotlar',
  mk_intro_step3: 'Kontaktlar va uchrashuv joyi',
  mk_intro_done: "E'lon allaqachon lentada",
  mk_save_exit: 'Saqlash va chiqish',
  mk_apply: 'Qoʻllash',
  mk_continue: 'Davom etish',
  mk_details_title: 'Mahsulot haqida gapiring',
  mk_status_review: 'Tekshiruvda',
  mk_status_active: 'Faol',
  mk_status_sold: 'Sotilgan',
  mk_status_archived: 'Arxivda',
  mk_status_rejected: 'Rad etilgan',
  mk_manage_title: 'Boshqarish',
  mk_manage_edit: 'Tahrirlash',
  mk_manage_edit_resubmit: 'Tahrirlab, qayta yuborish',
  mk_manage_mark_active: 'Faol qilish',
  mk_manage_mark_sold: 'Sotilgan deb belgilash',
  mk_manage_archive: 'Arxivlash',
  mk_manage_status: "Holatni o'zgartirish",
  mk_status_locked_note: "E'lon tekshiruvda. Holatni u tasdiqlangach o'zgartira olasiz.",
  mk_status_confirm_title: "Holatni o'zgartirilsinmi?",
  mk_status_confirm_body: 'E\'lon "{status}" deb belgilansinmi?',
  mk_cancel: 'Bekor qilish',
  mk_delete_confirm_title: "E'lonni o'chirilsinmi?",
  mk_delete_confirm_body: "Buni qaytarib bo'lmaydi.",
  mk_rejected_note: "E'lon rad etildi. Uni tahrirlab, qayta tekshiruvga yuboring.",
  mk_pending_note: "E'lon tekshiruvda — kutish vaqtida uni tahrirlash yoki o'chirish mumkin.",
  mk_updated_title: "O'zgarishlar saqlandi",
  mk_updated_body: "E'loningiz yangilandi.",
  mk_resubmit_title: 'Tekshiruvga yuborildi',
  mk_resubmit_body: "O'zgarishlarni tekshirib, tez orada e'lon qilamiz.",
  mk_save_changes: 'Saqlash',
  mk_photos_title: "E'lon rasmlarini qo'shing",
  mk_photos_hint: "1 dan 10 tagacha rasm qo'shish mumkin. Har bir rasm 10 MB dan kichik va 300×300 dan kam bo'lmasligi kerak.",
  mk_photos_tips_title: 'Mukammal rasmni qanday olish mumkin?',
  mk_photos_tips_cta: "Maslahatlarni ko'rish",
  mk_photos_from_gallery: 'Galereyadan',
  mk_photos_from_camera: 'Kamera',
  mk_photos_min_error: "Rasm kamida 300×300 bo'lishi kerak",
  mk_photos_size_error: "Rasm 10 MB dan kichik bo'lishi kerak",
  mk_photos_max_error: "10 tagacha rasm qo'shish mumkin",
  mk_crop_title: 'Rasmni kesing',
  mk_title_title: "E'lon nomini kiriting",
  mk_title_placeholder: 'Masalan, Polo yubka',
  mk_category_title: 'Kategoriyani tanlang',
  mk_category_suggested: 'Siz uchun tanladik',
  mk_category_other: 'Boshqa kategoriya',
  mk_char_title: 'Xususiyatlarni kiriting',
  mk_char_condition: 'Holati',
  mk_char_brand: 'Brend',
  mk_brand_none: 'Brendsiz',
  mk_brand_other: 'Boshqa brend',
  mk_brand_custom_ph: 'Brend nomini kiriting',
  mk_size_one: "Yagona o'lcham",
  mk_char_size: "O'lcham",
  mk_char_season: 'Mavsum',
  mk_char_length: 'Mahsulot uzunligi',
  mk_char_color: 'Rang',
  mk_char_select: 'Qiymatni tanlang',
  mk_char_modesty: 'Yopinganlar uchun mos',
  mk_char_fit: "Oʻtirishi",
  mk_char_material: 'Material',
  mk_char_country: 'Ishlab chiqaruvchi davlat',
  mk_search: 'Qidirish',
  mk_char_yes: 'Ha',
  mk_char_no: "Yo'q",
  mk_cond_used_good: "Ishlatilgan (a'lo, yangidek)",
  mk_cond_used_visible: 'Ishlatilgan (kiyilgan izlari bor)',
  mk_cond_used_defects: 'Ishlatilgan (sezilarli nuqsonlar bor)',
  mk_cond_new_with_tag: 'Yangi (yorliq bilan, qadoqda)',
  mk_season_demi: 'Kuz-bahor',
  mk_season_winter: 'Qish',
  mk_season_summer: 'Yoz',
  mk_season_all: 'Barcha mavsumlar',
  mk_length_maxi: 'Maksi',
  mk_length_midi: 'Midi',
  mk_length_mini: 'Mini',
  mk_color_black: 'Qora',
  mk_color_white: 'Oq',
  mk_color_beige: 'Bej',
  mk_color_gray: 'Kulrang',
  mk_color_blue: "Ko'k",
  mk_color_lightblue: 'Havorang',
  mk_color_red: 'Qizil',
  mk_color_green: 'Yashil',
  mk_color_yellow: 'Sariq',
  mk_color_pink: 'Pushti',
  mk_color_brown: 'Jigarrang',
  mk_color_purple: 'Binafsha',
  mk_color_orange: "To'q sariq",
  mk_color_multicolor: 'Rang-barang',
  mk_deal_title: 'Bitim shartlarini kiriting',
  mk_deal_conditions: 'Shartlar',
  mk_deal_sell: 'Narx belgilash',
  mk_deal_free: 'Tekin beraman',
  mk_deal_price: 'Narxi',
  mk_currency_uzs: "So'm",
  mk_currency_usd: 'sh.b.',
  mk_deal_urgent: 'Shoshilinch sotaman. Savdo bor',
  mk_desc_title: "Tavsif qo'shing",
  mk_desc_placeholder: 'Mahsulotni tavsiflang: material, xususiyatlar, sotish sababi',
  mk_loc_title: 'Xaridor bilan uchrashuv joyini kiriting',
  mk_loc_region_label: 'Hudud',
  mk_loc_district_label: 'Tuman',
  mk_loc_district_ph: 'Tumanni tanlang',
  mk_loc_search: "Manzil, do'kon yoki metro",
  mk_loc_map: 'Xaritada belgilash',
  mk_loc_map_change: "Xaritada joyni o'zgartirish",
  mk_loc_pick_title: 'Joyni tanlang',
  mk_loc_pick_hint: "Belgini kerakli joyga qo'yish uchun xaritani suring.",
  mk_loc_map_confirm: 'Joyni tasdiqlash',
  mk_loc_use_current: 'Mening joylashuvim',
  mk_loc_map_error: "Xaritani yuklab bo'lmadi. Aloqani tekshiring.",
  mk_loc_pinned: 'Joy tanlandi',
  mk_photos_add: "Rasm qo'shish",
  mk_photos_over_cap: "Faqat dastlabki {n} ta rasm saqlanadi (demo, backendsiz).",
  mk_no_image: "Rasm yo'q",
  mk_category_choose: 'Kategoriyani tanlash',
  mk_contact_tg_note: "Telegram username'ingizni qo'shing — xaridorlar sizga Telegramda yozadi.",
  mk_contact_tg_username_ph: 'username',
  mk_loc_landmark_label: "Mo'ljal kiriting",
  mk_loc_landmark_ph: 'Masalan, Oloy bozori',
  mk_loc_courier_note: 'Yetkazib berishni mustaqil tashkil qilasiz',
  mk_loc_courier: 'Kuryer orqali yuborishga tayyor',
  mk_phone_title: 'Telefon raqamingizni kiriting',
  mk_phone_subtitle: 'U orqali xaridorlar siz bilan bogʻlanadi. Undan avtorizatsiya uchun ham foydalanishingiz mumkin.',
  mk_phone_confirm: 'Telefon raqamini tasdiqlang',
  mk_phone_send_code: 'SMS kodni yuborish',
  mk_phone_authed_note: 'Siz kirgansiz:',
  mk_promote_title: "E'loningizni ko'zga ko'rinarli qiling",
  mk_promote_skip: "O'tkazib yuborish",
  mk_promote_maxi: 'Maksi kartochka',
  mk_promote_up: 'Yuqoriga',
  mk_promote_premium: 'Premium',
  mk_contacts_title: 'Profil maʻlumotlari va aloqa uchun kontaktlar',
  mk_contacts_name: 'Ism',
  mk_contacts_name_ph: 'Ismingiz',
  mk_contacts_methods: 'Siz bilan bogʻlanishning afzal usullari',
  mk_contacts_need_one: 'Xaridorlar bogʻlanishi uchun kamida bitta usulni tanlang.',
  mk_contact_chat: 'Ilovadagi chat',
  mk_contact_chat_note: 'Sukut boʻyicha yoqilgan',
  mk_contact_telegram: 'Telegram',
  mk_contact_call: "Telefon orqali qoʻngʻiroq",
  mk_contact_call_note: "Xaridorlar telefon raqamingizni koʻradi",
  mk_seller_contacts: 'Sotuvchi kontaktlari',
  mk_contact_chat_libas: 'LIBΛS ichidagi chat',
  mk_contact_via_telegram: "Telegram orqali bogʻlanish",
  mk_publish_cta: "E'lon joylash",
  // ── Лента (Feed) ──
  feed_tab: 'Lenta',
  feed_title: 'Lenta',
  feed_empty: "Hozircha post yo'q. Birinchi bo'lib obraz ulashing!",
  feed_publish_cta: 'Lentaga joylash',
  feed_publish_short: 'Joylash',
  feed_pick_sources_title: 'Obrazni tanlang',
  feed_select_hint: "Birga joylash uchun bittadan ko'pini tanlang",
  feed_add_more: "Yana qo'shish",
  feed_refresh: 'Yangilash',
  feed_src_library: 'Galereya',
  feed_lib_add: "Foto qo'shish",
  feed_section_empty: "Hozircha bo'sh",
  feed_add_tryon_title: "Primerkani qo'shasizmi?",
  feed_add_tryon_body: "Primerka natijasini qo'shing — shunda obraz nafaqat raskladkada, balki sizda qanday turishini ko'rishadi. Ixtiyoriy, lekin primerkali postlar ko'proq e'tibor oladi.",
  feed_add_tryon_cta: "Primerka qo'shish",
  feed_add_tryon_skip: 'Usiz joylash',
  feed_no_sources: "Hozircha joylashga narsa yo'q — avval obraz yarating.",
  feed_next: 'Keyingi',
  feed_caption_placeholder: 'Izoh qoʻshing… masalan, «yoz uchun ish obrazi»',
  feed_caption_label: 'Tavsif',
  feed_compose_title: 'Obrazni joylash',
  feed_compose_subtitle: "Uni lentadagi boshqalar ko'radi",
  feed_privacy_notice_flatlay: 'Manekendagi obraz joylanadi — shaxsiy suratingizsiz.',
  feed_privacy_notice_realphoto: "Bu postda primerkadagi haqiqiy suratingiz bor — uni hamma ko'radi.",
  feed_publishing: 'Joylanmoqda…',
  feed_publish_error: "Joylab bo'lmadi. Qayta urinib ko'ring.",
  feed_nsfw_blocked: "Rasm moderatsiyadan o'tmadi.",
  feed_published_title: 'Joylandi!',
  feed_published_body: 'Obrazingiz endi lentada.',
  feed_go_to_feed: 'Lentaga',
  feed_go_to_profile: 'Mening profilim',
  feed_report: 'Shikoyat',
  feed_report_title: 'Postga shikoyat',
  feed_reason_inappropriate: 'Nomaqbul kontent',
  feed_reason_spam: 'Spam',
  feed_reason_not_fashion: "Modaga aloqasi yo'q",
  feed_reason_copyright: 'Mualliflik huquqi buzilishi',
  feed_reason_other: 'Boshqa',
  feed_report_message_placeholder: 'Muammoni tasvirlang (ixtiyoriy)',
  feed_report_submit: 'Yuborish',
  feed_report_done: 'Rahmat, shikoyat yuborildi.',
  feed_hide_user: 'Foydalanuvchi postlarini yashirish',
  feed_hidden_done: 'Foydalanuvchi postlari yashirildi.',
  feed_delete: "O'chirish",
  feed_delete_confirm_title: "Post o'chirilsinmi?",
  feed_delete_confirm_body: "Buni qaytarib bo'lmaydi.",
  feed_cancel: 'Bekor qilish',
  feed_profile_posts: 'Obraz',
  feed_profile_likes: 'Layk',
  feed_profile_followers: 'Obunachi',
  feed_follow: 'Obuna bo‘lish',
  feed_following: 'Obuna bo‘lingan',
  feed_message: 'Yozish',
  feed_followers_title: 'Obunachilar',
  feed_followers_empty: 'Hozircha obunachi yo‘q',
  feed_profile_following: 'Obunalar',
  feed_following_title: 'Obunalar',
  feed_following_empty: 'Hozircha hech kimga obuna bo‘lmagan',
  feed_activity_title: 'Faoliyat',
  feed_tab_liked: 'Yoqtirilgan',
  feed_tab_commented: 'Izohlangan',
  feed_liked_empty: 'Hozircha yoqtirilgan post yo‘q',
  feed_commented_empty: 'Hozircha izoh qoldirilgan post yo‘q',
  feed_comments_title: 'Izohlar',
  feed_comments_empty: 'Hozircha izohlar yo‘q',
  feed_view_comments: 'Barcha {n} izohni ko‘rish',
  feed_add_comment_ph: 'Izoh qo‘shing…',
  feed_comment_send: 'Joylash',
  feed_edit_profile: 'Profilni tahrirlash',
  feed_profile_empty: "Hozircha post yo'q",
  feed_display_name: 'Ism',
  feed_username: 'Foydalanuvchi nomi',
  feed_username_taken: 'Band',
  feed_username_available: "Bo'sh",
  feed_username_required: 'Joylash uchun foydalanuvchi nomi tanlang',
  feed_bio: "O'zingiz haqingizda",
  feed_save: 'Saqlash',
  feed_avatar: 'Profil surati',
  mk_publish_error: "Joylab boʻlmadi. Qaytadan urinib koʻring.",
  mk_published_title: "E'lon tekshiruvda",
  mk_published_body: "Biz uni tekshirib, tez orada e'lon qilamiz. Uni «Mening e'lonlarim» bo'limida topishingiz mumkin.",
  mk_published_view: "E'lonni ko'rish",
  mk_published_back: 'Bozorga qaytish',
  mk_detail_characteristics: 'Xususiyatlar',
  mk_detail_description: 'Tavsif',
  mk_detail_location: 'Bitim joyi',
  mk_detail_open_map: 'Xaritani ochish',
  mk_detail_seller: 'Sotuvchi',
  mk_write: 'Yozish',
  mk_mine_title: "Mening e'lonlarim",
  mk_liked_title: 'Saralangan',
  mk_liked_empty: "Hozircha saralangan e'lonlar yo'q",
  mk_mine_drafts: 'Qoralamalar',
  mk_mine_published: 'Eʼlon qilingan',
  mk_mine_empty: "Sizda hali e'lonlar yo'q",
  mk_mine_continue: 'Davom etish',
  mk_mine_delete: "O'chirish",
  mk_draft_label: 'Qoralama',
  mk_chat_compose_ph: 'Assalomu alaykum! Hali ham aktualmi?',
  mk_chat_send: 'Yuborish',
  mk_chat_title: 'Sotuvchi bilan chat',
  mk_chat_seller_reply: 'Assalomu alaykum! Ha, aktual. Qachon uchrashsak qulay?',
  myOutfits: 'Obrazlarim',
  tabBoards: 'Doskalar',
  tabOutfits: 'Obrazlar',
  tabDressMe: 'Kiyintirish',
  tabCalendar: 'Kalendar',
  noTryOnsYet: "Hali primerka yo'q",
  noTryOnsHint: 'Virtual primerka natijalari shu yerda paydo boʻladi.',
  dressMeNeedsItems: 'Obraz yigʻish uchun yuqori, pastki va poyabzal qoʻshing.',
  newOutfit: 'Yangi obraz',
  addPiecesToBuildIt: "Qismlar qo'shib yarating",
  viewItems: "O'zgartirish",
  tryItOn: "Kiyib ko'ring",
  yourStyleStartsHere: 'Uslubingiz shu yerdan.',
  tapPlusToAddFirstPiece: "+  bosib birinchi narsani qo'shing.",
  tapRegeneratePrompt: 'Obrazingizni yaratish uchun ↻ bosing',
  addTopAndBottom: "Obraz yaratish uchun kamida bitta ustki va bitta pastki kiyim yoki ko'ylak qo'shing.",
  upperBody: 'Ustki kiyim',
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
  closetCropTitle: "Surat qo'shing",
  closetCropHint: 'Buyumni qirqish uchun burchaklardan torting. Qirqish ixtiyoriy.',
  closetDetailsTitle: 'Tafsilotlarni tanlang',
  closetDetailsHint: "Bu qanday buyum ekanini ko'rsating, shunda u kerakli bo'limga tushadi.",
  optSection: 'Boʻlim',
  optType: 'Tur',
  optSubtype: 'Quyi tur',
  optLength: 'Uzunlik / kesim',
  optFit: 'Oʻtirishi',
  stepChecking: 'Rasm tekshirilmoqda…',
  stepGenerating: 'Mahsulot rasmi yaratilmoqda… (~1 daqiqa)',
  stepRemovingBg: 'Fon o\'chirilmoqda…',
  stepAnalyzing: 'Uslub tahlil qilinmoqda…',
  stepAlmostDone: 'Deyarli tayyor…',
  stepProcessing: 'Ishlov berilmoqda…',
  delete: "O'chirish",
  save: 'Saqlash',
  share: 'Ulashish',
  shareToFeed: 'Lentaga joylash',
  shareExternal: "Boshqa ilovalarga ulashish",
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
  outfitCanvases: 'ta Obrazlar doskasi',
  regens: 'ta obraz yaratish',
  ruleBasedOutfits: 'qoidaga asoslangan obrazlar',
  tryOns: "ta kiyib ko'rish",
  calDays: 'kun kalendarda',
  reachedRegenLimit: "Siz {n} ta obraz yaratish imkoniyatidan foydalandingiz. Ko'proq uchun obunangizni yangilang.",
  reachedCanvasLimit: "Bu obrazlar doskasi qulflangan. Joriy rejangizda {n} ta doska mavjud. Barchasini ochish uchun obunangizni yangilang.",
  reachedTryOnLimit: "{n} ta kiyib ko'rishdan foydalandingiz. Ko'proq uchun rejani yangilang.",
  reachedItemLimit: "Garderob uchun {n} ta kiyim chegarasiga yetdingiz. Ko'proq uchun rejani yangilang.",
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
  continueWithGoogle: 'Google bilan davom etish',
  continueWithApple: 'Apple bilan davom etish',
  signingIn: 'Kirilmoqda…',
  socialAuthError: 'Kirib bo‘lmadi. Qayta urinib ko‘ring.',
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
  onboarding_slide3_body: "Sun'iy intellekt garderobingizdan bir zumda obraz kombinatsiyalarini yaratadi.",
  onboarding_slide4_title: "Obrazingizni sozlang",
  onboarding_slide4_body: "Istalgan kiyimni almashtiring, qo'shing yoki olib tashlang \u2014 mukammal obraz yarating.",
  onboarding_slide5_title: "Virtual kiyib ko'rish",
  onboarding_slide5_body: "Uydan chiqmasdan obraz qanday ko'rinishini ko'ring. Rasmingizni yuklang va bir zumda kiyib ko'ring.",
  onboarding_cta_title: "Birinchi kiyimingizni qo'shing",
  onboarding_cta_body: "Bitta kiyimdan boshlang. Qolganini biz qilamiz.",
  onboarding_btn_next: "Keyingi",
  onboarding_btn_skip: "O'tkazib yuborish",
  onboarding_btn_add_item: "Kiyim qo'shish",
  // ── Interactive onboarding wizard ──
  ob_skip: "O'tkazib yuborish",
  ob_add_any_photo: "Istalgan surat mos keladi — hatto tez olingan surat ham. Qolganini o'zimiz tartibga solamiz.",
  ob_beautify_title: 'Suratingizni avtomatik ravishda tozalab berdik',
  ob_beautify_subtitle: 'Fon olib tashlandi — faqat kiyimingiz qoldi.',
  ob_beautify_before: 'Oldin',
  ob_beautify_after: 'Keyin',
  ob_beautify_cta: "Zo'r →",
  gs_title: "Shaxsiy uslub tavsiyalari uchun yana {n} ta kiyim qo'shing",
  gs_progress: "{total} tadan {done} tasi qo'shildi",
  gs_cta: "Qo'shish",
  gs_dismiss: 'Yopish',
  // ── Closet v2 ──
  cv_hero_title: "Garderobingizni yig'ing",
  cv_hero_subtitle: "Suratga oling — biz nomlaymiz, fonini olib tashlaymiz va joylashtiramiz. Hammasi AI bilan.",
  cv_add_item: "Qo'shish",
  cv_add_title: "Garderobga qo'shish",
  cv_build_title: "Yuqori va pastki kiyim qo'shing",
  cv_build_subtitle: "Yuqori va pastki — yoki libos va poyabzal qo'shib, shaxsiy uslubni oching.",
  cv_build_top: 'Yuqori',
  cv_build_bottom: 'Pastki',
  cv_build_dress: 'Libos',
  cv_build_shoes: 'Poyabzal',
  cv_build_adding: "Buyumlaringiz qo'shilmoqda…",
  cv_show_bt_title: 'Suratga oling — tozalaymiz',
  cv_show_bt_cap: 'Har qanday buyumni suratga oling — AI fonni olib tashlab, garderobga joylaydi.',
  cv_show_to_title: 'Kiyib ko‘rish',
  cv_show_to_cap: 'Kiyishdan oldin buyum sizga qanday yarashishini ko‘ring.',
  cv_show_to_mannequin: 'Manekenda ko‘ring',
  cv_show_to_me: 'Yoki o‘z suratingizda',
  cv_show_to_covered: 'Yopiq, hijobli uslub',
  cn_title: 'Tangalar',
  cn_have: 'Sizda {n} ta',
  cn_need_more: 'Tangalar yetarli emas — davom etish uchun to‘ldiring.',
  cn_do_title: 'Nima qila olasiz',
  cn_do_upload: 'Kiyim qo‘shish',
  cn_free: 'Bepul',
  cn_do_outfit: 'Obraz yaratish',
  cn_do_beautify: 'Beautify',
  cn_do_tryon: 'Kiyib ko‘rish',
  cn_pack_title: 'Tanga sotib olish',
  cn_off: '−{n}%',
  cn_custom: 'Yoki o‘z miqdoringizni kiriting',
  cn_custom_ph: 'Tangalar soni',
  cn_total: 'Jami',
  cn_hint_next: 'Yana {n} ta qo‘shing va −30% oling',
  cn_warn: 'Natija qaytarilmaydi — har bir ishga tushirish tanga sarflaydi.',
  cn_survey: 'Ba’zan so‘rovnomalar orqali tanga topishingiz mumkin.',
  cn_buy: '{n} ta tanga sotib olish',
  cn_note: 'Tangalar to‘lov tekshirilgach zudlik bilan — odatda bir necha daqiqada — qo‘shiladi. Telegramda tasdiqlaymiz.',
  cn_currency: 'so‘m',
  cn_tg_msg: '{n} ta tanga sotib olmoqchiman ({price}). Raqamim: ',
  cv_proc_removing: "Fon o'chirilmoqda… ✂️",
  cv_proc_identifying: 'Kategoriya aniqlanmoqda… 🏷️',
  cv_fix_title: 'Ushbu buyumlarni aniqlashga yordam bering',
  cv_fix_subtitle: "To'g'ri kategoriyani tanlang, shunda biz ularni stillashtira olamiz.",
  cv_fix_done: 'Tayyor',
  cv_fix_later: "Keyinroq to'ldirish",
  cv_add_reassure: "Istalgan surat mos keladi. Biz uni tozalaymiz, nomlaymiz va garderobga joylaymiz.",
  cv_src_gallery: 'Galereya',
  cv_src_gallery_sub: 'Suratlaringizdan tanlang',
  cv_src_camera: 'Kamera',
  cv_src_camera_sub: 'Yangi surat oling',
  cv_shop_title: "Do'kondan qo'shish",
  cv_shop_add_n: "{n} tasini qo'shish",
  cv_shop_hint: "Bir teginish · surat shart emas",
  cv_shop_search: "Do'kondan qidirish…",
  cv_shop_added: "Garderobga qo'shildi",
  cv_shop_empty: 'Mahsulot topilmadi',
  cv_rv_adding: "{n} ta kiyim qo'shilyapti…",
  cv_rv_new_items: "{n} ta yangi kiyim",
  cv_rv_identifying: 'Aniqlanyapti…',
  cv_rv_select_all: 'Hammasini tanlash',
  cv_rv_delete: "O'chirish",
  cv_rv_beautify_banner: "Surat yoqmadimi? Beautify bilan yaxshilang.",
  cv_rv_confirm: 'Tayyor',
  cv_rv_add_to_closet: "Garderobga qo'shish",
  cv_rv_detail_view: 'Batafsil',
  cv_rv_add_details: "Ma'lumot qo'shing",
  cv_rv_complete_hint: "Davom etish uchun har bir buyum kategoriyasini tanlang",
  cv_rv_tryon: 'Hoziroq kiyib ko\'rish',
  cv_rv_edit_cat: "Toifani o'zgartirish",
  cv_rv_more: "Batafsil",
  cv_rv_added_toast: "Garderobga qo'shildi",
  cv_rv_rejected: 'Bu suratda kiyim aniqlanmadi',
  cv_rv_processing: 'Tayyorlanyapti…',
  cv_bt_button: 'Beautify',
  cv_bt_title: 'Qaysi biri chiroyliroq?',
  cv_bt_subtitle: "Nimani saqlashni o'zingiz tanlaysiz",
  cv_bt_original: 'Asl surat',
  cv_bt_beautified: 'Yaxshilangan surat',
  cv_bt_save: 'Yaxshilanganini saqlash',
  cv_bt_keep: 'Aslini qoldirish',
  cv_bt_working: 'Yaxshilanyapti…',
  cv_bt_ready: 'Yaxshilangan surat tayyor — solishtirish uchun bosing',
  cv_bt_failed: 'Ishlamadi — qayta urinib ko\'ring',
  cv_bt_soon: 'Beautify tez orada',
  cv_dt_original: 'Asl',
  cv_dt_beautified: 'Yaxshilangan',
  cv_dt_color: 'Rang',
  cv_dt_season: 'Fasl',
  cv_dt_material: 'Mato',
  cv_dt_pattern: 'Naqsh',
  cv_dt_style: 'Uslub',
  cv_dt_worn: '{n} marta kiyilgan',
  cv_dt_worn_never: 'Hali kiyilmagan',
  cv_dt_mark_worn: 'Belgilash',
  cv_dt_tryon: "Kiyib ko'rish",
  cv_dt_name_placeholder: 'Kiyim nomi',
  cv_bt_intro_title: 'Beautify bilan tanishing',
  cv_bt_intro_body: "Beautify suratingizni toza studiya ko'rinishiga aylantiradi. Biz yaxshilangan variantni tayyorlaymiz — saqlashni o'zingiz hal qilasiz.",
  cv_bt_intro_cta: 'Tushunarli',
  cv_bt_auto_kicker: 'Beautify bilan tanishing',
  cv_bt_auto_headline: 'Suratlaringizni avtomatik tozalaymiz',
  cv_bt_intro_caption: "Beautify fonni olib tashlaydi va suratni toza mahsulot ko'rinishiga aylantiradi.",
  cv_bt_intro_do: 'Suratimni yaxshilash',
  cv_bt_intro_skip: 'Keyinroq',
  cv_bt_intro_skip_add: "Yaxshilamasdan qo'shish",
  cv_bt_never: "Boshqa ko'rsatilmasin",
  cv_bt_per_photo: 'har surat uchun',
  ob_welcome_title: "Libas AI'ga xush kelibsiz",
  ob_welcome_body: "Birinchi uslubingizni atigi bir daqiqada yig'amiz. Ko'rsatmalarga amal qiling — har bir qadamni ko'rsatamiz.",
  ob_welcome_cta: 'Boshlash',
  ob_add_upper_title: "Birinchi kiyimni qo'shing",
  ob_add_upper_body: "Futbolka, jaket yoki ko'ylakni suratga oling yoki yuklang. Ilova fonni o'zi olib tashlaydi — faqat kiyim qoladi.",
  ob_add_lower_title: "Pastki qismini qo'shing",
  ob_add_lower_body: "Endi jinsi, yubka yoki shim qo'shing — birinchi uslubingiz deyarli tayyor!",
  ob_add_shoes_title: "Oyoq kiyim qo'shing",
  ob_add_shoes_body: "Krossovka, poshnali tufli yoki etik qo'shib obrazni yakunlang — birinchi AI obrazingiz deyarli tayyor.",
  ob_add_pick_photo: 'Galereyadan tanlash',
  ob_add_take_photo: 'Rasmga olish',
  ob_add_choose_category: 'Kategoriyani tanlang',
  ob_add_save: "Garderobga qo'shish",
  ob_add_change_photo: "Rasmni o'zgartirish",
  ob_add_processing: 'Kiyim qayta ishlanmoqda…',
  ob_dress_skip_toast: "Ko'ylak — bu tayyor ko'rinish. Endi oyoq kiyim qo'shing!",
  ob_generate_title: "Uslubni yig'ing",
  ob_generate_body: "Tugmani bosing — ilova kiyimlaringizni chiroyli bitta uslubga birlashtiradi.",
  ob_generate_cta: "Uslubni yig'ish",
  ob_generating: 'Obraz tayyorlanmoqda…',
  ob_generate_again: 'Boshqasini sinab ko\'rish',
  ob_generate_continue: 'Ajoyib →',
  ob_edit_title: "O'zingizga moslang",
  ob_edit_body: "Kiyimlarni barmog'ingiz bilan suring va o'zingizcha joylashtiring. Yoqqach — saqlang.",
  ob_edit_cta: 'Saqlash',
  ob_edit_open: 'Tahrirlovchini ochish',
  ob_tryon_title: "O'zingizda kiyib ko'ring",
  ob_tryon_body: "Uslub aynan sizda qanday ko'rinishini ko'ring. Bu taxminan bir daqiqa vaqt oladi.",
  ob_tryon_cta: "Kiyib ko'rish",
  ob_tryon_quota_note: "Virtual kiyib ko'rishni istalgan vaqtda garderobdan ishga tushirishingiz mumkin.",
  ob_tryon_continue: 'Yakunlash →',
  ob_done_title: 'Hammasi tayyor! ✨',
  ob_done_body: "Garderobingiz tayyor. Istalgan vaqtda kiyim qo'shing, obrazlar yarating va ularni kiyib ko'ring.",
  ob_done_cta: 'Garderobimga o\'tish',
  tryOnConfirmTitle: "Kiyib ko'rish?",
  tryOnConfirmBody: "Bu obraz sizga qanday yarashishini ko'ring",
  tryOnCancel: 'Bekor',
  tryOnConfirm: "Kiyib ko'rish",
  tryOnTargetMannequin: 'Manekenga',
  tryOnTargetMannequinHint: "Model ustida klassik ko'rinish",
  tryOnTargetSelf: "O'z suratimga",
  tryOnTargetSelfHint: "Surat yuklang — obrazni sizga kiydiramiz",
  tryOnUploadPhoto: 'Surat yuklash',
  tryOnChangePhoto: "Suratni o'zgartirish",
  tryOnPhotoHint: "To'liq bo'yli surat, yaxshi yorug'lik, kameraga qarab",
  tryOnUploading: 'Yuklanmoqda…',
  tryOnPhotoFailed: "Yuklab bo'lmadi. Boshqa surat tanlang.",
  tryOnPhotoWhatTitle: 'Qanday surat yuklash kerak?',
  tryOnPhotoWhatBody: "Yaxshi natija uchun to'liq bo'yda, faqat o'zingiz tushgan, oddiy (yaxshisi oq) yoki toza fonli suratni yuklang. Oyoqlaringiz to'liq ko'rinsin va kiyimingiz yopilib qolmasin.",
  tryOnDeleteTitle: "Bu obrazni o'chirilsinmi?",
  tryOnDeleteBody: "Buni qaytarib bo'lmaydi.",
  tryOnDeleteFailed: "O'chirib bo'lmadi. Qaytadan urinib ko'ring.",
  tryOnStarting: "Kiyib ko'rish boshlanmoqda...",
  tryOnGenerating: "Ko'rinishingiz yaratilmoqda...",
  tryOnPhase2: "Obrazingiz tahlil qilinmoqda...",
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
    "Yenglarni shimarib qo'yish har qanday obrazni bir zumda erkin ko'rsatadi.",
    "Yaxshi dazmollangan ko'ylak hatto eng oddiy obrazni ham ko'taradi.",
    "To'q ranglar ingichkalatadi, och ranglar hajm qo'shadi.",
    "Oyoq kiyim butun obrazning ohangini belgilaydi.",
    "Ko'ylagingizni ichkariga suqib qo'yish bo'sh obrazga tuzilma beradi.",
    "Naqshlarni aralashtirish ishlaydi: biri yirik, ikkinchisi kichik bo'lsa.",
    "Oq krossovkalar deyarli hamma narsa bilan mos keladi.",
    "Kamar har qanday obrazning siluetini o'zgartirishi mumkin.",
    "Qattiq sumkalar rasmiyroq, yumshoq sumkalar kundalikroq ko'rinadi.",
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
  tryOnFailedSafety:
    "Bu surat ishlatib bo'lmadi — u kontent xavfsizligi tekshiruvidan o'tmadi. Boshqa surat yoki kiyimni sinab ko'ring.",
  tryOnFailedTimeout:
    "Bu kutilganidan ko'proq vaqt olmoqda. Iltimos, biroz o'tib qayta urinib ko'ring.",
  tryOnFailedGeneric:
    "Kiyib ko'rishni yaratib bo'lmadi. Iltimos, qayta urinib ko'ring.",
  close: 'Yopish',
  retry: 'Qayta urinish',
  loadMore: 'Yana koʻrsatish',
  myLooks: "Mening obrazlarim",
  myLooksSaved: 'saqlangan',
  myLooksEmpty: "Hali saqlangan ko'rinish yo'q",
  myLooksEmptyHint: "Try-on ko'rinishini yarating va u bu yerda avtomatik paydo bo'ladi",
  myLooksSaveLook: "Obrazni saqlash",
  justNow: 'Hozirgina',
  minutesAgo: '{n} daqiqa oldin',
  yesterday: 'Kecha',
  feedbackBannerTitle: 'LIBΛS’ni yaxshilashga yordam bering 💬',
  feedbackBannerBody: 'Fikr-mulohaza qoldiring yoki muammo haqida xabar bering — jamoamizga to‘g‘ridan-to‘g‘ri yozing.',
  feedbackBannerCta: 'Fikr bildirish',
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
  emptyStep1: "Ustki kiyim qo'shing",
  emptyStep2: "Pastki kiyim qo'shing",
  emptyStep3: 'Obraz yarating',
  emptyAddTap: "Qo'shish uchun bosing",
  generateHint: "Kiyimlaringizdan tayyor obraz yaratamiz",
  noItemsInSection: "Hali narsalar yo'q",
  tapPlusToAdd: "Birinchi kiyimni qo'shish uchun + bosing",
  addUpperFirst: "Boshlash uchun ustki kiyim qo'shing",
  addLowerOrShoes: "Pastki kiyim yoki oyoq kiyim qo'shing",
  saveNeedsTopItem: "Obrazni saqlash uchun kamida bitta ustki kiyim qo'shing.",
  // ── Canvas hints ────────────────────────────────────────────────
  canvasEmptyHint: "Birinchi kiyimni qo'shish uchun + bosing",
  canvasHintDrag: "Ko'chirish uchun torting",
  canvasHintPinch: "O'lcham uchun qistiring",
  canvasHintSwap: "Bosing → Almashtirish",
  canvasDemoIntro: "Istalgan kiyimni ko'chirishingiz mumkin",
  canvasDemoSwap: "Shunchaki torting ✨",
  canvasDemoDone: "Endi o'zingiz sinab ko'ring!",
  profile: 'Profil',
  logout: 'Chiqish',
  theme: 'Mavzu',
  themeLight: 'oq',
  themeDark: 'qora',
  dayNames: ['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'],
  monthNames: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
  demoAddTitle: "O'z kiyimlaringizni qo'shing",
  demoAddBody: "Obraz yaratish va kiyib ko'rish uchun kiyimlaringiz rasmini yuklang!",
  tooFewItemsTitle: "Yangi obrazlar uchun kiyim yetarli emas",
  tooFewItemsBody: "Xilma-xil obrazlar uchun AI'ga ko'proq kiyim kerak. Yangi kiyimlar qo'shing!",
  outfitsExhaustedTitle: "Obrazlar yaratilmoqda",
  outfitsExhaustedBody: "AI yangi kombinatsiyalarni qidirmoqda. 30–60 soniyadan so'ng ✦ tugmasini bosing.",
  addClothingBtn: "Kiyim qo'shish",
  readyLabel: '✓ Tayyor!',
  moreNeeded: 'yana {n} ta',
  regenerateWithAI: 'AI bilan yangilash',
  generateOutfitLabel: 'Kombinatsiya yaratish',
  aiThinking: "AI o'ylayapti…",

  cats: {
    tops: 'Toplar',
    tshirts: 'Futbolkalar',
    blouses: 'Bluzkalar',
    dresses: "Ko'ylaklar",
    jumpsuits: 'Kombinezonlar',
    jackets: 'Kurtkalar',
    skirts: 'Yubkalar',
    jeans: 'Jinsilar',
    pants: 'Shimlar',
    shorts: 'Shortlar',
    shoes: 'Oyoq kiyim',
    sneakers: 'Krossovkalar',
    heels: 'Poshnali tufli',
    boots: 'Etiklar',
    sandals: 'Sandallar',
    flats: 'Baletkalar',
    bags: 'Sumkalar',
    accessories: 'Aksessuarlar',
    shawl: "Ro'mol",
    jewelry: 'Taqinchoqlar',
    underwear: 'Ichki kiyim',
  },
  categoryLabels: {
    tops: 'Toplar',
    tshirts: 'Futbolkalar',
    blouses: 'Bluzkalar',
    dresses: "Ko'ylaklar",
    jumpsuits: 'Kombinezonlar',
    jackets: 'Kurtkalar',
    skirts: 'Yubkalar',
    jeans: 'Jinsilar',
    pants: 'Shimlar',
    shorts: 'Shortlar',
    shoes: 'Oyoq kiyim',
    sneakers: 'Krossovkalar',
    heels: 'Poshnali tufli',
    boots: 'Etiklar',
    sandals: 'Sandallar',
    flats: 'Baletkalar',
    bags: 'Sumkalar',
    accessories: 'Aksessuarlar',
    shawl: "Ro'mol",
    jewelry: 'Taqinchoqlar',
    underwear: 'Ichki kiyim',
  },
};

export const translations: Record<Locale, Translations> = { en, ru, uz };
