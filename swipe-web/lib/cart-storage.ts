export interface CartItem {
  cartId: string;
  productId: string;
  title: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl: string;
  selectedSize?: string;
  selectedColor?: string;
  quantity: number;
  addedAt: string;
}

const CART_KEY = 'cart_items';

function readAll(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]') as CartItem[];
  } catch {
    return [];
  }
}

function saveAll(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function getCartItems(): CartItem[] {
  return readAll();
}

export function addToCart(item: Omit<CartItem, 'cartId' | 'addedAt'>): void {
  const items = readAll();
  const existing = items.find(
    (i) =>
      i.productId === item.productId &&
      i.selectedSize === item.selectedSize &&
      i.selectedColor === item.selectedColor
  );
  if (existing) {
    existing.quantity += item.quantity;
    saveAll(items);
  } else {
    items.unshift({ ...item, cartId: `cart_${Date.now()}`, addedAt: new Date().toISOString() });
    saveAll(items);
  }
}

export function removeFromCart(cartId: string): void {
  saveAll(readAll().filter((item) => item.cartId !== cartId));
}

export function updateQuantity(cartId: string, quantity: number): void {
  const items = readAll();
  const item = items.find((i) => i.cartId === cartId);
  if (item) {
    item.quantity = Math.max(1, quantity);
    saveAll(items);
  }
}

export function clearCart(): void {
  saveAll([]);
}

export function formatPrice(price: number, currency: string): string {
  if (currency === 'USD') return `$${price.toFixed(2)}`;
  // Space as thousands separator — matches Flutter's formattedPrice
  return `${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')} ${currency}`;
}
