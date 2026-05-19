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
