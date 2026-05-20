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
  | 'TOPS' | 'TSHIRTS' | 'SHIRTS' | 'PANTS' | 'JEANS' | 'SKIRTS'
  | 'DRESSES' | 'SHOES' | 'BAGS' | 'ACCESSORIES' | 'HIJAB_SCARVES'
  | 'OUTERWEAR' | 'OTHER';

export type UploadJobStatus =
  | 'UPLOADED' | 'NSFW_CHECKED' | 'BG_REMOVED' | 'UPSCALED'
  | 'EMBEDDED' | 'ANALYZED' | 'READY' | 'FAILED' | 'REJECTED_NSFW';

export interface WardrobeUploadInitResponse {
  uploadJobId: string;
  blobKey: string;
  uploadUrl: string;
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
  layer: 'INNER' | 'MID' | 'OUTER' | null;
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
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
