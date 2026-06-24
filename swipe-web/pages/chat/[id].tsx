import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, Send, Smile, Paperclip, X, ImageIcon } from 'lucide-react';
import { FullPageLoader } from '@/components/LoadingSpinner';
import ChatEmojiPanel from '@/components/ChatEmojiPanel';
import { getChatMessages, sendChatMessage, sendMultipartMessage, getChats } from '@/lib/api';
import { getUser } from '@/lib/auth';
import type { ChatMessage, ChatSummary } from '@/types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Deterministic gradient for avatar fallback (mirrors mobile)
const GRADIENTS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#F5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#30cfd0', '#330867'],
  ['#a8edea', '#fed6e3'],
  ['#ff9a9e', '#fecfef'],
];
function getGradient(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length] as [string, string];
}

export default function ChatDetailPage() {
  const router = useRouter();
  const chatId = router.query.id as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chat, setChat] = useState<ChatSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachPreviews, setAttachPreviews] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  const user = getUser();
  const userId = (user?.id ?? user?.userId ?? '') as string;

  // Product info passed as query params from product page (fallback if chat summary not loaded)
  const qProductTitle = router.query.productTitle as string | undefined;
  const qProductBrand = router.query.productBrand as string | undefined;
  const qProductImage = router.query.productImage as string | undefined;
  const qProductPrice = router.query.productPrice as string | undefined;
  const qProductCurrency = router.query.productCurrency as string | undefined;
  const qSelectedColor = router.query.selectedColor as string | undefined;
  const qSelectedSize = router.query.selectedSize as string | undefined;
  const qQuantity = router.query.quantity as string | undefined;
  const qSellerName = router.query.sellerName as string | undefined;
  const qSellerLogo = router.query.sellerLogo as string | undefined;

  // Initial load
  useEffect(() => {
    if (!chatId) return;
    Promise.all([
      getChatMessages(chatId),
      getChats(0, 50).then((chats) => chats.find((c) => c.id === chatId) ?? null),
    ])
      .then(([msgs, foundChat]) => {
        setMessages(msgs);
        messagesRef.current = msgs;
        setChat(foundChat);
      })
      .finally(() => setLoading(false));
  }, [chatId]);

  // Poll for new messages every 5 seconds (picks up seller replies)
  useEffect(() => {
    if (!chatId) return;
    const id = setInterval(async () => {
      try {
        const fresh = await getChatMessages(chatId);
        // Only update if there are genuinely more messages (avoids flicker)
        if (fresh.length !== messagesRef.current.length) {
          messagesRef.current = fresh;
          setMessages(fresh);
        }
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(id);
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for prefilled message from Flutter (query param ?message=...)
  useEffect(() => {
    const pending = router.query.message as string | undefined;
    if (pending) setText(decodeURIComponent(pending));
  }, [router.query.message]);

  // Resize textarea to fit content
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 112) + 'px';
    }
  }, []);

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    resizeTextarea();
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart ?? text.length;
      const end = el.selectionEnd ?? text.length;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
        resizeTextarea();
      }, 0);
    } else {
      setText((t) => t + emoji);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setAttachedFiles((prev) => [...prev, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setAttachPreviews((prev) => [...prev, ...previews]);
    e.target.value = '';
  }

  function removeAttachment(i: number) {
    URL.revokeObjectURL(attachPreviews[i]);
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i));
    setAttachPreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  const canSend = (text.trim().length > 0 || attachedFiles.length > 0) && !sending;

  async function handleSend() {
    if (!canSend || !chatId) return;
    const content = text.trim();
    const files = [...attachedFiles];

    // Optimistic: show message immediately
    const optimisticId = `opt-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
      senderId: userId,
      senderType: 'USER',
      content: content || (files.length ? `📎 ${files.map((f) => f.name).join(', ')}` : ''),
      messageType: 'TEXT',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setText('');
    setAttachedFiles([]);
    setAttachPreviews([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setShowEmoji(false);
    setSending(true);
    setMessages((prev) => {
      const updated = [...prev, optimistic];
      messagesRef.current = updated;
      return updated;
    });

    try {
      let msg: ChatMessage;
      if (files.length > 0) {
        msg = await sendMultipartMessage(chatId, content, files);
      } else {
        msg = await sendChatMessage(chatId, content);
      }
      // Replace optimistic with real message
      setMessages((prev) => {
        const updated = prev.map((m) => (m.id === optimisticId ? msg : m));
        messagesRef.current = updated;
        return updated;
      });
    } catch {
      // Remove optimistic on failure and restore input
      setMessages((prev) => {
        const updated = prev.filter((m) => m.id !== optimisticId);
        messagesRef.current = updated;
        return updated;
      });
      if (content) setText(content);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Resolved display values — prefer API chat summary, fall back to query params
  const sellerName = chat?.sellerName ?? qSellerName ?? 'Chat';
  const sellerLogo = chat?.sellerLogo ?? qSellerLogo;
  const productTitle = chat?.productTitle ?? qProductTitle;
  const productImage = (chat?.productImage || qProductImage) || undefined;
  const productBrand = qProductBrand;
  const productPrice = qProductPrice ? Number(qProductPrice) : undefined;
  const productCurrency = qProductCurrency;
  const selectedColor = qSelectedColor || undefined;
  const selectedSize = qSelectedSize || undefined;
  const quantity = qQuantity ? Number(qQuantity) : undefined;
  const [gradFrom, gradTo] = getGradient(sellerName);

  // Bottom bar height changes when emoji panel is open
  const inputBarHeight = showEmoji ? 'auto' : undefined;

  return (
    <div className="phone-container flex flex-col bg-white h-screen">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 h-[60px] flex items-center gap-3 px-4 shrink-0">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center -ml-1 rounded-full active:bg-gray-100 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>

        {/* Seller avatar */}
        <div
          className="w-9 h-9 rounded-full overflow-hidden shrink-0"
          style={!sellerLogo ? { background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` } : undefined}
        >
          {sellerLogo ? (
            <Image
              src={sellerLogo}
              alt={sellerName}
              width={36}
              height={36}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
              {sellerName[0].toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-black truncate leading-tight">{sellerName}</p>
          {productTitle && (
            <p className="text-[11px] text-gray-400 truncate leading-tight">{productTitle}</p>
          )}
        </div>
      </header>

      {/* ── Product context banner ── */}
      {productTitle && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
          {/* Product image */}
          {productImage ? (
            <Image
              src={productImage}
              alt={productTitle}
              width={52}
              height={64}
              className="rounded-xl object-cover shrink-0"
              style={{ width: 52, height: 64 }}
              unoptimized
            />
          ) : (
            <div className="rounded-xl bg-gray-200 shrink-0" style={{ width: 52, height: 64 }} />
          )}
          {/* Product details */}
          <div className="flex-1 min-w-0">
            {productBrand && (
              <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wide">{productBrand}</p>
            )}
            <p className="text-[12px] font-semibold text-black leading-snug line-clamp-2">{productTitle}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {selectedColor && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/8 text-gray-600">{selectedColor}</span>
              )}
              {selectedSize && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/8 text-gray-600">Size {selectedSize}</span>
              )}
              {quantity && quantity > 1 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/8 text-gray-600">Qty {quantity}</span>
              )}
            </div>
            {productPrice && productCurrency && (
              <p className="text-[12px] font-semibold text-black mt-1">
                {productPrice.toLocaleString()} {productCurrency}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <main
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2"
        style={{ paddingBottom: showEmoji ? '320px' : '72px' }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full"><FullPageLoader /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-2"
              style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
            >
              {sellerName[0].toUpperCase()}
            </div>
            <p className="text-[14px] font-semibold text-black">{sellerName}</p>
            <p className="text-[13px] text-gray-400">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg) => {
            // The listing context card is shown in the header banner — skip the empty bubble.
            if ((msg.messageType as string) === 'LISTING') return null;
            // Own-message detection: prefer the server's authoritative is_mine (correct for B2B
            // and C2C alike); fall back to senderId / senderType for realtime/optimistic messages.
            const isOwn = msg.isMine != null
              ? msg.isMine
              : (userId ? msg.senderId === userId : msg.senderType === 'USER');
            const images = (msg.attachments ?? []).filter((a) =>
              a.fileType?.startsWith('image/') || a.fileUrl?.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)
            );
            const files = (msg.attachments ?? []).filter((a) =>
              !a.fileType?.startsWith('image/') && !a.fileUrl?.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)
            );

            // Product card message — either explicit PRODUCT type or legacy 📦 text format
            const isProductMsg = msg.messageType === 'PRODUCT' || msg.content?.startsWith('📦');
            const title = msg.productTitle
              ?? (msg.content?.match(/📦 Product Inquiry: (.+?)\s*\|/)?.[1] ?? '');
            const sizeMatch = msg.content?.match(/Size:\s*([^|]+)/);
            const qtyMatch  = msg.content?.match(/Qty:\s*(\d+)/);
            const priceMatch = msg.content?.match(/Price:\s*([^|]+)/);
            const pSize  = msg.productSize  ?? sizeMatch?.[1]?.trim();
            const pQty   = msg.productQuantity ?? (qtyMatch  ? Number(qtyMatch[1])  : undefined);
            const pPrice = msg.productPrice
              ?? (priceMatch ? priceMatch[1].trim() : undefined);
            const pColor = msg.productColor;
            const pImage = msg.productImage;

            if (isProductMsg && title) {
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] rounded-[18px] overflow-hidden border text-[13px] leading-snug ${
                      isOwn
                        ? 'border-gray-200 rounded-br-[4px]'
                        : 'border-gray-200 rounded-bl-[4px]'
                    }`}
                  >
                    {/* Product card */}
                    <div className="flex gap-3 p-3 bg-white">
                      {pImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pImage}
                          alt={title}
                          className="rounded-xl object-cover shrink-0"
                          style={{ width: 52, height: 68 }}
                        />
                      ) : (
                        <div className="rounded-xl bg-gray-100 shrink-0" style={{ width: 52, height: 68 }} />
                      )}
                      <div className="flex-1 min-w-0 py-0.5">
                        <p className="text-[12px] font-semibold text-black leading-snug line-clamp-2">{title}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {pColor && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{pColor}</span>
                          )}
                          {pSize && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">Size {pSize}</span>
                          )}
                          {pQty && pQty > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">Qty {pQty}</span>
                          )}
                        </div>
                        {pPrice && (
                          <p className="text-[12px] font-semibold text-black mt-1.5">{pPrice}</p>
                        )}
                      </div>
                    </div>
                    {/* Timestamp footer */}
                    <div className={`px-3 py-1.5 text-[10px] text-right ${isOwn ? 'bg-gray-50 text-gray-400' : 'bg-gray-50 text-gray-400'}`}>
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              );
            }

            const hasContent = msg.content?.trim();

            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] text-[13px] leading-snug flex flex-col gap-1`}>
                  {/* Image attachments — each in its own bubble */}
                  {images.map((img, i) => (
                    <div key={i} className={`overflow-hidden ${isOwn ? 'rounded-[18px] rounded-br-[4px]' : 'rounded-[18px] rounded-bl-[4px]'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.fileUrl}
                        alt="attachment"
                        className="block max-w-full"
                        style={{ maxHeight: 280, objectFit: 'cover' }}
                      />
                    </div>
                  ))}

                  {/* File attachments */}
                  {files.map((f, i) => (
                    <a
                      key={i}
                      href={f.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-3.5 py-2.5 ${
                        isOwn
                          ? 'bg-black text-white rounded-[18px] rounded-br-[4px]'
                          : 'bg-gray-100 text-black rounded-[18px] rounded-bl-[4px]'
                      }`}
                    >
                      <ImageIcon size={16} />
                      <span className="truncate max-w-[160px]">
                        {f.fileUrl.split('/').pop()?.split('?')[0] ?? 'File'}
                      </span>
                    </a>
                  ))}

                  {/* Text content (only if present, or if no attachments at all) */}
                  {(hasContent || (!images.length && !files.length)) && (
                    <div
                      className={`px-3.5 py-2.5 ${
                        isOwn
                          ? 'bg-black text-white rounded-[18px] rounded-br-[4px]'
                          : 'bg-gray-100 text-black rounded-[18px] rounded-bl-[4px]'
                      }`}
                    >
                      {hasContent && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                      <p className={`text-[10px] mt-1 text-right ${isOwn ? 'text-gray-400' : 'text-gray-400'}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  )}
                  {/* Timestamp when only attachments (no text) */}
                  {!hasContent && (images.length > 0 || files.length > 0) && (
                    <p className={`text-[10px] text-right ${isOwn ? 'text-gray-400' : 'text-gray-400'}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </main>

      {/* ── Input bar + emoji panel (fixed to bottom) ── */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100"
        style={{ height: inputBarHeight }}
      >
        {/* Emoji panel (above input) */}
        {showEmoji && (
          <ChatEmojiPanel onEmojiSelect={insertEmoji} />
        )}

        {/* Attachment previews */}
        {attachPreviews.length > 0 && (
          <div className="flex gap-2 px-3 pt-2 pb-0 overflow-x-auto hide-scrollbar">
            {attachPreviews.map((src, i) => (
              <div key={i} className="relative shrink-0">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  {attachedFiles[i]?.type.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={24} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black flex items-center justify-center"
                >
                  <X size={11} color="white" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div
          className="flex items-end gap-1.5 px-3 py-2.5"
          style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Emoji button */}
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className={`w-9 h-9 flex items-center justify-center rounded-full shrink-0 active:bg-gray-100 transition-colors ${showEmoji ? 'bg-gray-100' : ''}`}
            aria-label="Emoji"
          >
            <Smile size={20} strokeWidth={1.8} className={showEmoji ? 'text-black' : 'text-gray-500'} />
          </button>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowEmoji(false)}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 border border-gray-200 rounded-[22px] px-3.5 py-2 text-[13px] outline-none focus:border-black transition-colors resize-none overflow-y-auto leading-snug"
            style={{ maxHeight: '112px' }}
          />

          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 flex items-center justify-center rounded-full shrink-0 active:bg-gray-100 transition-colors"
            aria-label="Attachment"
          >
            <Paperclip size={20} strokeWidth={1.8} className={attachedFiles.length > 0 ? 'text-black' : 'text-gray-500'} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="w-9 h-9 rounded-full bg-black flex items-center justify-center shrink-0 disabled:opacity-30 transition-opacity"
            aria-label="Send"
          >
            <Send size={15} color="white" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}
