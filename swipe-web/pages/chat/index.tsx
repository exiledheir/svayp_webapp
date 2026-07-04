import { needsUnoptimized } from '@/lib/img';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { WifiOff, RefreshCw, MessageCircle } from 'lucide-react';
import { TopBar } from '@/components/BottomNav';
import BottomNav from '@/components/BottomNav';
import { FullPageLoader } from '@/components/LoadingSpinner';
import { getChats } from '@/lib/api';
import type { ChatSummary } from '@/types';

function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Deterministic gradient based on name (mirrors mobile _getGradientColors)
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

function Avatar({ name, logo }: { name: string; logo?: string }) {
  const [from, to] = getGradient(name || '?');
  return (
    <div className="relative shrink-0">
      <div
        className="w-[54px] h-[54px] rounded-full overflow-hidden"
        style={!logo ? { background: `linear-gradient(135deg, ${from}, ${to})` } : undefined}
      >
        {logo ? (
          <Image
            src={logo}
            alt={name}
            width={54}
            height={54}
            className="object-cover w-full h-full"
            unoptimized={needsUnoptimized(logo)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
            {(name || '?')[0].toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatListPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    getChats()
      .then(setChats)
      .catch(() => setError('Failed to load chats'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="phone-container flex flex-col bg-white" style={{ height: '100dvh' }}>
      <TopBar title="Messages" />

      <main className="flex-1 overflow-y-auto pb-nav" style={{ paddingTop: 64 }}>
        {loading ? (
          <div className="flex items-center justify-center h-64"><FullPageLoader /></div>
        ) : error ? (
          /* ── Error state (mirrors mobile _buildErrorState) ── */
          <div className="flex flex-col items-center justify-center h-[65vh] gap-6 px-10 text-center">
            <WifiOff size={80} strokeWidth={1.2} className="text-gray-300" />
            <div>
              <p className="text-base font-semibold text-black mb-2">Something went wrong</p>
              <p className="text-sm text-gray-500">We couldn&apos;t load your messages. Please check your connection.</p>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-2 px-8 py-3.5 bg-black text-white text-sm font-medium rounded-xl"
            >
              <RefreshCw size={16} strokeWidth={2} />
              Try again
            </button>
          </div>
        ) : chats.length === 0 ? (
          /* ── Empty state (mirrors mobile _buildEmptyState) ── */
          <div className="flex flex-col items-center justify-center h-[65vh] gap-6 px-10 text-center">
            <MessageCircle size={100} strokeWidth={1} className="text-gray-200" />
            <div>
              <p className="text-base font-semibold text-black mb-2">No messages yet</p>
              <p className="text-sm text-gray-500">Contact sellers from a product page to start a conversation.</p>
            </div>
          </div>
        ) : (
          <ul>
            {chats.map((chat) => {
              const hasUnread = (chat.unreadCount ?? 0) > 0;
              const name = chat.sellerName ?? 'Seller';
              return (
                <li key={chat.id}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-[10px] text-left active:bg-gray-50 transition-colors"
                    onClick={() => router.push(`/chat/${chat.id}`)}
                  >
                    {/* Avatar */}
                    <Avatar name={name} logo={chat.sellerLogo} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-[14px] truncate ${hasUnread ? 'font-semibold text-black' : 'font-semibold text-black'}`}>
                          {name}
                        </p>
                        <p className={`text-[12px] shrink-0 ${hasUnread ? 'font-semibold text-black' : 'text-gray-500'}`}>
                          {formatTime(chat.lastMessageAt)}
                        </p>
                      </div>
                      <p className={`text-[13px] truncate mt-0.5 ${hasUnread ? 'font-medium text-black' : 'text-gray-500'}`}>
                        {chat.lastMessagePreview ?? 'No messages yet'}
                      </p>
                    </div>

                    {/* Unread badge */}
                    {hasUnread && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-black text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {(chat.unreadCount ?? 0) > 99 ? '99+' : chat.unreadCount}
                      </span>
                    )}
                  </button>
                  {/* Indented divider (matches mobile indent: 82) */}
                  <div className="ml-[82px] h-px bg-gray-100" />
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
