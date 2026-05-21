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

export type WardrobeCategory =
  | 'TOPS' | 'TSHIRTS' | 'BLOUSES' | 'DRESSES' | 'JUMPSUITS' | 'JACKETS'
  | 'SKIRTS' | 'JEANS' | 'PANTS' | 'SHORTS'
  | 'SHOES' | 'SNEAKERS' | 'HEELS' | 'BOOTS' | 'SANDALS' | 'FLATS'
  | 'BAGS' | 'ACCESSORIES' | 'SHAWL' | 'JEWELRY' | 'UNDERWEAR';

export type WardrobeSubcategory =
  | 'TOPS' | 'TSHIRTS' | 'BLOUSES' | 'DRESSES' | 'JUMPSUITS' | 'JACKETS'
  | 'SKIRTS' | 'JEANS' | 'PANTS' | 'SHORTS'
  | 'SHOES' | 'SNEAKERS' | 'HEELS' | 'BOOTS' | 'SANDALS' | 'FLATS'
  | 'BAGS' | 'ACCESSORIES' | 'SHAWL' | 'JEWELRY' | 'UNDERWEAR';

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
  layer: 'BASE' | 'MID' | 'OUTER' | null;
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

export type PlanTier = 'FREE' | 'TRIAL' | 'PREMIUM';

export interface PlanLimits {
  wardrobeItems: number;
  canvases: number;
  tryOnPerMonth: number;
  regenPerMonth: number;
  calendarDays: number;
}

export interface PlanUsage {
  wardrobeItems: number;
  canvases: number;
  tryOnThisMonth: number;
  regenThisMonth: number;
}

export interface UserPlanResponse {
  tier: PlanTier;
  trialEndsAt: string | null;
  premiumEndsAt: string | null;
  limits: PlanLimits;
  usage: PlanUsage;
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
