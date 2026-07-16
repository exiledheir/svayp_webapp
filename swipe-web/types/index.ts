export interface Product {
  id: string;
  brand: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  currency: string;
  images: string[];
  sizes?: string[];
  colors?: string[];
  inStock: boolean;
  rating?: number;
  sellerId?: string;
  isNew?: boolean;
  titleLocalized?: Record<string, string>;
  descriptionLocalized?: Record<string, string>;
}

export interface SellerLocation {
  name?: string;
  address?: string;
  phoneNumber?: string;
  isPrimary?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface SellerInfo {
  id: string;
  name: string;
  logoImg?: string;
  description?: string;
  productCount?: number;
  primaryAddress?: string;
  phoneNumber?: string;
  websiteUrl?: string;
  locations?: SellerLocation[];
}

export interface ChatSummary {
  id: string;
  subject?: string;
  status: string;
  sellerName?: string;
  sellerLogo?: string;
  productTitle?: string;
  productImage?: string;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  senderType: 'USER' | 'SELLER' | 'ADMIN';
  /** Server-computed: true if sent by the requesting user. Authoritative bubble alignment. */
  isMine?: boolean;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'PRODUCT' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
  attachments?: Array<{ fileUrl: string; fileType: string }>;
  // Product-card fields (present when messageType === 'PRODUCT')
  productId?: string;
  productTitle?: string;
  productImage?: string;
  productPrice?: number;
  productColor?: string;
  productSize?: string;
  productQuantity?: number;
}

// ── Wardrobe ──────────────────────────────────────────────────────────────────

// New section-level taxonomy (migration V96). The legacy values below remain
// valid (accepted by the backend) so older items keep working unchanged.
export type WardrobeSection =
  | 'TOPS' | 'BOTTOMS' | 'DRESSES_SETS' | 'OUTERWEAR' | 'FOOTWEAR' | 'ACCESSORIES';

export type WardrobeCategory =
  // new sections
  | 'BOTTOMS' | 'DRESSES_SETS' | 'OUTERWEAR' | 'FOOTWEAR' | 'OTHER'
  // legacy
  | 'TOPS' | 'TSHIRTS' | 'BLOUSES' | 'DRESSES' | 'JUMPSUITS' | 'JACKETS'
  | 'SKIRTS' | 'JEANS' | 'PANTS' | 'SHORTS'
  | 'SHOES' | 'SNEAKERS' | 'HEELS' | 'BOOTS' | 'SANDALS' | 'FLATS'
  | 'BAGS' | 'ACCESSORIES' | 'SHAWL' | 'JEWELRY' | 'UNDERWEAR';

export type WardrobeSubcategory =
  // new "type of item" values
  | 'TSHIRTS_TOPS' | 'SHIRTS_BLOUSES' | 'SWEATERS_KNITS'
  | 'TROUSERS_JEANS' | 'LEGGINGS_TRIKO'
  | 'SETS'
  | 'JACKET' | 'COAT' | 'PUFFER' | 'TRENCH'
  | 'ANKLE_BOOTS' | 'HIGH_BOOTS' | 'PUMPS'
  | 'HEADSCARF_HIJAB' | 'SCARF' | 'GLASSES' | 'HEADWEAR' | 'BELT'
  // legacy / shared
  | 'TOPS' | 'TSHIRTS' | 'BLOUSES' | 'DRESSES' | 'JUMPSUITS' | 'JACKETS'
  | 'SKIRTS' | 'JEANS' | 'PANTS' | 'SHORTS'
  | 'SHOES' | 'SNEAKERS' | 'HEELS' | 'BOOTS' | 'SANDALS' | 'FLATS'
  | 'BAGS' | 'ACCESSORIES' | 'SHAWL' | 'JEWELRY' | 'UNDERWEAR';

// Subcategory of a garment (only where applicable — e.g. shirts, knits, sets, jewelry).
export type WardrobeItemType =
  | 'T_SHIRT' | 'TANK_TOP' | 'TOP' | 'LONGSLEEVE' | 'POLO'
  | 'SHIRT' | 'BLOUSE' | 'TUNIC'
  | 'SWEATER' | 'HOODIE' | 'CARDIGAN' | 'TURTLENECK' | 'VEST'
  | 'DUO' | 'TRIO' | 'SUIT' | 'JUMPSUIT'
  | 'EARRINGS' | 'BRACELET' | 'CHAIN' | 'RING' | 'WATCH';

// Length / cut.
export type WardrobeLength =
  | 'MINI' | 'MIDI' | 'MAXI' | 'KNEE_LENGTH' | 'ABOVE_KNEE' | 'ANKLE'
  | 'FLOOR_LENGTH' | 'BERMUDA' | 'STRAIGHT' | 'FLARED' | 'SKINNY' | 'TEA_LENGTH';

// Fit type.
export type WardrobeFitType = 'REGULAR' | 'LOOSE' | 'SLIM';

export type UploadJobStatus =
  | 'UPLOADED' | 'NSFW_SCAN' | 'UPSCALE' | 'BG_REMOVE'
  | 'EMBED' | 'ANALYZE' | 'COMPLETED' | 'FAILED';

export interface WardrobeUploadInitResponse {
  uploadJobId: string;
  blobKey: string;
  putUrl: string;
  uploadUrlExpiresAt: string;
  httpMethod: string;
}

export interface WardrobeUploadStatus {
  uploadJobId: string;
  wardrobeItemId: string | null;
  status: UploadJobStatus;
  progressPercent: number;
  currentStep: string;
  failureReason: string | null;
  updatedAt: string;
}

export interface WardrobeItemResponse {
  id: string;
  category: WardrobeCategory;
  subcategory: WardrobeSubcategory;
  itemType: WardrobeItemType | null;
  length: WardrobeLength | null;
  fitType: WardrobeFitType | null;
  layer: 'BASE' | 'MID' | 'OUTER' | 'BOTTOM' | null;
  status: string;
  imageUrl: string;
  thumbnailUrl: string;
  colorPrimary: string;
  pattern: string;
  material: string;
  season: string;
  styleTags: string[];
  formalityScore: number;
  warmthScore: number;
  userLabel: string | null;
  userNotes: string | null;
  isFavorite: boolean;
  isClean: boolean;
  timesWorn: number;
  lastWornAt: string | null;
  createdAt: string;
  /** Товар каталога, из которого клонирована вещь (from-catalog); иначе null. */
  sourceProductId?: string | null;
  /** Вещь уже улучшена (beautify) — повторно улучшать нельзя. */
  beautified?: boolean;
}

export interface WardrobeStats {
  ready: number;
  processing: number;
  failed: number;
  archived: number;
  total: number;
  itemCountByCategory: Record<string, number>;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ── Plan ──────────────────────────────────────────────────────────────────────

export type PlanTier = 'free' | 'pro' | 'premium';

export interface PlanLimits {
  wardrobeItems: number;
  outfitCanvases: number;
  tryItOns: number;
  regenerations: number;
  calendarDays: number;
}

export interface PlanUsage {
  wardrobeItemsUsed: number;
  regenerationsUsed: number;
  tryItOnsUsed: number;
  itemCountByCategory: Record<string, number>;
}

export interface UserPlanResponse {
  userId: string;
  plan: PlanTier;
  limits: PlanLimits;
  usage: PlanUsage;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

// ── Outfit Canvases ───────────────────────────────────────────────────────────

export interface OutfitCanvasItemRequest {
  wardrobeItemId: string;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  itemGroup: string;
}

export interface OutfitCanvasItemResponse {
  id: string;
  wardrobeItemId: string;
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  itemGroup: string;
}

export interface OutfitCanvasResponse {
  id: string;
  name: string;
  occasion: string | null;
  thumbnailUrl: string | null;
  items: OutfitCanvasItemResponse[];
  createdAt: string;
  updatedAt: string;
}

// ── Outfit Suggestions ────────────────────────────────────────────────────────

export interface OutfitSuggestionResponse {
  id: string;
  userId: string;
  coreItemIds: string[];
  optionalItemIds: string[];
  scoreTotal: number;
  scoreColor: number;
  scoreStyle: number;
  scoreFit: number;
  scoreDiversity: number;
  silhouetteType: string | null;
  colorStoryType: string | null;
  seasonTarget: string | null;
  weatherTarget: string | null;
  temperatureC: number | null;
  targetDate: string | null;
  hasHijabLayer: boolean;
  generatedBy: string | null;
  collagePreviewUrl: string | null;
  createdAt: string;
}

// ── Try-On ────────────────────────────────────────────────────────────────────

export type TryOnStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface TryOnJobResponse {
  id: string;
  canvasId: string | null;
  wardrobeItemIds: string[];
  status: TryOnStatus;
  modelImageUrl: string | null;
  resultImageUrl: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ── SSE ───────────────────────────────────────────────────────────────────────

export interface SseHandle {
  close: () => void;
}

export interface UploadProgressEvent {
  type: 'upload.progress';
  uploadJobId: string;
  status: UploadJobStatus;
  progressPercent: number;
  currentStep: string;
  wardrobeItemId: string | null;
  failureReason: string | null;
}

export interface TryOnProgressEvent {
  type: 'tryon.progress';
  jobId: string;
  status: TryOnStatus;
  resultImageUrl: string | null;
  failureReason: string | null;
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export interface CalendarDayEntry {
  date: string;
  outfits: OutfitSuggestionResponse[];
}

export interface CalendarResponse {
  from: string;
  to: string;
  days: CalendarDayEntry[];
}
