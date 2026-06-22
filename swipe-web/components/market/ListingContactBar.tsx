import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { MessageCircle, Send, X } from 'lucide-react';
import type { MarketListing } from '@/types/market';
import { startMarketChat, buildTelegramLink, openTelegramLink } from '@/lib/market-chat';
import { formatPrice } from '@/lib/cart-storage';
import { useI18n } from '@/lib/i18n';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';

export default function ListingContactBar({ listing }: { listing: MarketListing }) {
  const router = useRouter();
  const { t } = useI18n();
  const [showCompose, setShowCompose] = useState(false);
  const [message, setMessage] = useState('');

  const hasChat = listing.contactMethods.includes('chat');
  const hasTelegram = listing.contactMethods.includes('telegram');
  const priceText = listing.dealType === 'free' ? t.mk_free : formatPrice(listing.price, t.mk_currency_uzs);

  function openCompose() {
    setMessage(t.mk_chat_compose_ph);
    setShowCompose(true);
  }

  function sendMessage() {
    logAnalyticsEvent(Events.MARKET_CONTACT_CHAT_TAPPED, { listing_id: listing.id });
    const thread = startMarketChat(listing, message, t.mk_chat_seller_reply);
    setShowCompose(false);
    router.push(`/market/chat/${thread.id}`);
  }

  function openTelegram() {
    logAnalyticsEvent(Events.MARKET_CONTACT_TELEGRAM_TAPPED, {
      listing_id: listing.id,
      [Params.MK_HAS_TELEGRAM_USERNAME]: !!listing.seller.telegramUsername,
    });
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}/market/${listing.id}` : '';
    openTelegramLink(buildTelegramLink(listing.seller, listing, url));
  }

  return (
    <>
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pt-3 flex gap-3"
        style={{
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          borderTop: '0.5px solid rgba(0,0,0,0.08)',
        }}
      >
        {hasChat && (
          <button
            onClick={openCompose}
            className="flex-1 flex items-center justify-center gap-1.5 text-[15px] font-bold text-white active:opacity-90"
            style={{ height: 52, borderRadius: 14, background: '#000' }}
          >
            <MessageCircle size={17} strokeWidth={2.2} />
            {t.mk_write}
          </button>
        )}
        {hasTelegram && (
          <button
            onClick={openTelegram}
            className={`${hasChat ? 'w-[52px]' : 'flex-1'} flex items-center justify-center gap-1.5 text-[15px] font-semibold active:opacity-90`}
            style={{ height: 52, borderRadius: 14, background: '#229ED9', color: 'white' }}
            aria-label="Telegram"
          >
            <Send size={18} strokeWidth={2} />
            {!hasChat && 'Telegram'}
          </button>
        )}
      </div>

      {/* Compose sheet */}
      {showCompose && (
        <div
          className="absolute inset-0 z-[80] flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowCompose(false)}
        >
          <div
            className="px-5 pt-4 pb-6 bg-white dark:bg-[#1c1c1e]"
            style={{ borderRadius: '24px 24px 0 0', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-bold text-black dark:text-white">{t.mk_chat_title}</h2>
              <button onClick={() => setShowCompose(false)} aria-label="Close">
                <X size={22} className="text-black/50 dark:text-white/50" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4 p-2.5 rounded-2xl" style={{ background: 'rgba(128,128,128,0.08)' }}>
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: '#F7F7F8' }}>
                {listing.images[0] && (
                  <Image src={listing.images[0]} alt={listing.title} fill sizes="48px" className="object-cover" unoptimized />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate text-black dark:text-white">{listing.title}</p>
                <p className="text-[13px] font-bold mt-0.5 text-[#F370A7]">{priceText}</p>
              </div>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              autoFocus
              className="w-full p-3.5 rounded-2xl text-[15px] resize-none outline-none text-black dark:text-white"
              style={{ background: 'rgba(128,128,128,0.08)', border: '1px solid rgba(128,128,128,0.18)' }}
            />

            <button
              onClick={sendMessage}
              disabled={!message.trim()}
              className="w-full mt-3 py-3.5 rounded-2xl text-white font-semibold text-[15px] active:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: '#F370A7' }}
            >
              <Send size={17} strokeWidth={2} />
              {t.mk_chat_send}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
