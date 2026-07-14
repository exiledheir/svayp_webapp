// ─── Mock C2C chat (no backend) ──────────────────────────────────────────────
// The existing lib/api.ts chat is backend-backed B2B seller chat — unsuitable
// for user-to-user listings. This is a self-contained localStorage mock that
// powers /market/chat/[id]. Replace with a real C2C chat backend later.

import type { MarketListing, MarketSeller } from '@/types/market';

const CHATS_KEY = 'market_chats';

export interface MarketChatMessage {
  id: string;
  from: 'me' | 'seller';
  text: string;
  at: string; // ISO
}

export interface MarketChatThread {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  sellerName: string;
  messages: MarketChatMessage[];
  createdAt: string;
}

const isBrowser = () => typeof window !== 'undefined';

function readAll(): MarketChatThread[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(CHATS_KEY) ?? '[]') as MarketChatThread[];
  } catch {
    return [];
  }
}

function saveAll(threads: MarketChatThread[]): void {
  if (isBrowser()) localStorage.setItem(CHATS_KEY, JSON.stringify(threads));
}

export function getMarketChats(): MarketChatThread[] {
  return readAll().sort((a, b) => {
    const la = a.messages[a.messages.length - 1]?.at ?? a.createdAt;
    const lb = b.messages[b.messages.length - 1]?.at ?? b.createdAt;
    return lb.localeCompare(la);
  });
}

export function getMarketChat(id: string): MarketChatThread | undefined {
  return readAll().find((c) => c.id === id);
}

/**
 * Starts (or reuses) a chat thread for a listing, seeds it with the buyer's
 * first message and a canned seller reply so the thread isn't empty.
 */
export function startMarketChat(
  listing: MarketListing,
  firstMessage: string,
  sellerReply: string,
): MarketChatThread {
  const threads = readAll();
  const existing = threads.find((c) => c.listingId === listing.id);
  if (existing) {
    if (firstMessage.trim()) {
      existing.messages.push({ id: `m_${Date.now()}`, from: 'me', text: firstMessage.trim(), at: new Date().toISOString() });
      saveAll(threads);
    }
    return existing;
  }
  const now = new Date().toISOString();
  const thread: MarketChatThread = {
    id: `mc_${Date.now()}`,
    listingId: listing.id,
    listingTitle: listing.title,
    listingImage: listing.images[0] ?? '',
    sellerName: listing.seller.name,
    createdAt: now,
    messages: [
      { id: `m_${Date.now()}`, from: 'me', text: firstMessage.trim() || '...', at: now },
      { id: `m_${Date.now() + 1}`, from: 'seller', text: sellerReply, at: new Date(Date.now() + 1000).toISOString() },
    ],
  };
  threads.unshift(thread);
  saveAll(threads);
  return thread;
}

export function sendMarketMessage(threadId: string, text: string): void {
  if (!text.trim()) return;
  const threads = readAll();
  const thread = threads.find((c) => c.id === threadId);
  if (!thread) return;
  thread.messages.push({ id: `m_${Date.now()}`, from: 'me', text: text.trim(), at: new Date().toISOString() });
  saveAll(threads);
}

// ── Telegram deep link ───────────────────────────────────────────────────────
// KNOWN LIMITATION (mock): a listing carries a phone, not a Telegram username,
// and there is no reliable phone→profile deep link. So:
//  1. if the seller has a username → open their profile (telegram.me/<username>)
//  2. otherwise → open a share dialog prefilled with the listing + the seller's
//     phone as plain text the buyer can use to add the contact manually.
// Replace with a real Telegram-username field when the backend lands.
export function buildTelegramLink(seller: MarketSeller, listing: MarketListing, listingUrl: string): string {
  if (seller.telegramUsername) {
    return `https://telegram.me/${seller.telegramUsername.replace(/^@/, '')}`;
  }
  const text = `${listing.title}\n${listingUrl}${seller.phone ? `\n☎ ${seller.phone}` : ''}`;
  return `https://telegram.me/share/url?url=${encodeURIComponent(listingUrl)}&text=${encodeURIComponent(text)}`;
}

/** Opens a Telegram link, preferring the in-WebView API when available. */
export function openTelegramLink(url: string): void {
  const tg = (window as unknown as {
    Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } };
  }).Telegram?.WebApp;
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else window.open(url, '_blank');
}
