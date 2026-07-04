import { needsUnoptimized } from '@/lib/img';
import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, Send } from 'lucide-react';
import {
  getChatThread, getChatMessages, getChatMessagesAfter, sendChatMessage, markChatRead,
  type MarketChatThread, type MarketChatMessage,
} from '@/lib/market-api';
import MarketGuard from '@/components/market/MarketGuard';
import { useI18n } from '@/lib/i18n';

function MarketChatThreadPageInner() {
  const router = useRouter();
  const { t } = useI18n();
  const { id } = router.query;
  const [thread, setThread] = useState<MarketChatThread | null>(null);
  const [messages, setMessages] = useState<MarketChatMessage[]>([]);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<MarketChatMessage[]>([]);
  // createdAt of the newest server message — delta-poll cursor.
  const lastServerTsRef = useRef<string | null>(null);

  async function reload() {
    if (typeof id !== 'string') return;
    try {
      const [th, msgs] = await Promise.all([getChatThread(id), getChatMessages(id, 0, 100)]);
      setThread(th);
      // Backend returns newest-first; show oldest-first. Skip the LISTING context card (no text).
      const list = msgs.content.filter((m) => m.content).reverse();
      setMessages(list);
      messagesRef.current = list;
      if (msgs.content.length > 0) lastServerTsRef.current = msgs.content[0].createdAt;
      markChatRead(id).catch(() => { /* non-blocking */ });
    } catch {
      setThread(null);
    }
  }

  useEffect(() => { reload(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Light polling for the counterparty's replies (STOMP can replace this later).
  // Delta request (?after=) — was a full thread + 100-message refetch every tick.
  useEffect(() => {
    if (typeof id !== 'string') return;
    const iv = setInterval(async () => {
      try {
        const after = lastServerTsRef.current;
        if (!after) { reload(); return; }
        const fresh = await getChatMessagesAfter(id, after, 100);
        if (fresh.length === 0) return;
        lastServerTsRef.current = fresh[fresh.length - 1].createdAt;
        const known = new Set(messagesRef.current.map((m) => m.id));
        const toAdd = fresh.filter((m) => m.content && !known.has(m.id));
        if (toAdd.length > 0) {
          const updated = [...messagesRef.current, ...toAdd];
          messagesRef.current = updated;
          setMessages(updated);
          // Something new arrived — mark the counterparty's messages read.
          markChatRead(id).catch(() => { /* non-blocking */ });
        }
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(iv);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend() {
    if (typeof id !== 'string' || !text.trim()) return;
    const body = text;
    setText('');
    try {
      const msg = await sendChatMessage(id, body);
      // Append the server response locally — a full thread reload per send
      // cost 2 extra requests; the 5s delta poll picks up anything else.
      if (msg.createdAt) lastServerTsRef.current = msg.createdAt;
      if (msg.content) {
        const updated = [...messagesRef.current, msg];
        messagesRef.current = updated;
        setMessages(updated);
      }
    } catch {
      setText(body); // restore on failure
    }
  }

  // Always return to the market feed. router.back() is unreliable inside the
  // native app's WebView: its initial about:blank→url load inflates
  // window.history.length, so a history-based guard mis-fires and router.back()
  // steps to a blank entry instead of the feed, making Back appear to do
  // nothing. Navigate to the feed directly (matching /market/mine & /liked).
  function handleBack() {
    router.push('/market');
  }

  return (
    <>
      <Head>
        <title>{thread?.counterpartyName ?? t.mk_chat_title}</title>
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
                  <Image src={thread.listingImage} alt={thread.listingTitle} fill sizes="36px" className="object-cover" unoptimized={needsUnoptimized(thread.listingImage)} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold truncate text-black dark:text-white">{thread.counterpartyName ?? t.mk_chat_title}</p>
                <p className="text-[12px] truncate text-black/45 dark:text-white/45">{thread.listingTitle}</p>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {messages.map((m) => {
            const mine = m.senderId !== thread?.counterpartyId;
            return (
              <div
                key={m.id}
                className={`max-w-[78%] px-3.5 py-2.5 text-[14px] leading-snug ${mine ? 'self-end text-white' : 'self-start text-black dark:text-white'}`}
                style={{
                  borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: mine ? '#F370A7' : 'rgba(128,128,128,0.14)',
                }}
              >
                {m.content}
              </div>
            );
          })}
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
