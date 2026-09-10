import React from 'react';
import { useRouter } from 'next/router';
import { Send } from 'lucide-react';
import { openNativeChatList } from '@/lib/flutter-bridge';
import { useNativeChatUnread } from '@/lib/use-native-chat-unread';

/**
 * Paper-plane header button that opens the NATIVE chat list with the live
 * unread badge — Chat left the app's bottom bar, so every tab header carries
 * this entry point instead. Render only when `isShellTab()` is true.
 *
 * Defaults match the shared header icon (bare 22px glyph in a 36px tap box,
 * no chrome) used by Closet / Feed / Market and by the native MainTopBar, so
 * pages normally render it with no props at all.
 */
export default function NativeChatButton({
  className = 'w-9 h-9 flex items-center justify-center rounded-full active:opacity-60 transition-opacity text-black dark:text-white',
  style,
  size = 22,
}: {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}) {
  const router = useRouter();
  const unread = useNativeChatUnread();
  return (
    <button
      onClick={() => {
        if (!openNativeChatList()) router.push('/chat');
      }}
      className={`relative shrink-0 ${className}`}
      style={style}
      aria-label="Chat"
    >
      <Send size={size} strokeWidth={1.9} />
      {unread > 0 && (
        <span
          className="absolute top-0.5 right-0 min-w-[16px] h-4 px-1 rounded-full text-white text-[9px] font-bold leading-4 text-center"
          style={{ background: '#FF3B30' }}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}
