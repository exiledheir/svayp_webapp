import { useEffect, useState } from 'react';

type ShellWindow = Window & {
  __svaypChatUnread?: number;
  __svaypSetChatUnread?: (n: number) => void;
};

/**
 * Unread-chat count pushed by the native shell (WebViewScreen._syncChatUnreadToWeb)
 * on page load and on every change. Chat is native (it left the app's bottom
 * bar), so the page can't fetch this itself. Always 0 in a browser or an old
 * app build, which never inject the setter.
 */
export function useNativeChatUnread(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const w = window as unknown as ShellWindow;
    // The shell may have injected the value before this effect registered.
    setCount(Math.max(0, Number(w.__svaypChatUnread) || 0));
    w.__svaypSetChatUnread = (n) => setCount(Math.max(0, Number(n) || 0));
    return () => {
      delete w.__svaypSetChatUnread;
    };
  }, []);
  return count;
}
