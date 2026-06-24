import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, Send } from 'lucide-react';
import { getMarketChat, sendMarketMessage, type MarketChatThread } from '@/lib/market-chat';
import MarketGuard from '@/components/market/MarketGuard';
import { useI18n } from '@/lib/i18n';

function MarketChatThreadPageInner() {
  const router = useRouter();
  const { t } = useI18n();
  const { id } = router.query;
  const [thread, setThread] = useState<MarketChatThread | null>(null);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  function reload() {
    if (typeof id === 'string') setThread(getMarketChat(id) ?? null);
  }

  useEffect(() => { reload(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread]);

  function handleSend() {
    if (typeof id !== 'string' || !text.trim()) return;
    sendMarketMessage(id, text);
    setText('');
    reload();
  }

  // `router.back()` is a no-op without in-app history (deep link / hard reload /
  // first screen in the WebView). Fall back to the market feed so Back always works.
  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/market');
    }
  }

  return (
    <>
      <Head>
        <title>{thread?.sellerName ?? t.mk_chat_title}</title>
      </Head>

      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-3 py-3" style={{ borderBottom: '0.5px solid rgba(128,128,128,0.2)' }}>
          <button onClick={handleBack} aria-label="Back" className="w-9 h-9 flex items-center justify-center">
            <ArrowLeft size={22} className="text-black dark:text-white" />
          </button>
          {thread && (
            <>
              <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0" style={{ background: '#F7F7F8' }}>
                {thread.listingImage && (
                  <Image src={thread.listingImage} alt={thread.listingTitle} fill sizes="36px" className="object-cover" unoptimized />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold truncate text-black dark:text-white">{thread.sellerName}</p>
                <p className="text-[12px] truncate text-black/45 dark:text-white/45">{thread.listingTitle}</p>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {thread?.messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[78%] px-3.5 py-2.5 text-[14px] leading-snug ${m.from === 'me' ? 'self-end text-white' : 'self-start text-black dark:text-white'}`}
              style={{
                borderRadius: m.from === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.from === 'me' ? '#F370A7' : 'rgba(128,128,128,0.14)',
              }}
            >
              {m.text}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))', borderTop: '0.5px solid rgba(128,128,128,0.2)' }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder={t.mk_chat_send}
            className="flex-1 h-11 px-4 rounded-full text-[15px] outline-none text-black dark:text-white"
            style={{ background: 'rgba(128,128,128,0.12)' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-40 shrink-0"
            style={{ background: '#F370A7' }}
            aria-label={t.mk_chat_send}
          >
            <Send size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
}

export default function MarketChatThreadPage() {
  return (
    <MarketGuard>
      <MarketChatThreadPageInner />
    </MarketGuard>
  );
}
