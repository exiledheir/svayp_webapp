/**
 * Direct 1:1 messaging from the feed (Instagram-style "Message" on a profile).
 *
 * Mirrors lib/support-chat.ts and the marketplace contact flow: create/reuse the
 * thread on the backend, then hand it off to the NATIVE chat module inside the
 * Flutter app (via the `open_chat` bridge). In a plain browser it falls back to
 * the webapp chat thread at `/chat/{id}`.
 */
import type { NextRouter } from 'next/router';
import { createDirectChat } from '@/lib/api';
import { openNativeChat } from '@/lib/flutter-bridge';

/**
 * Open (or create) a direct chat with `recipientUserId` and show it.
 *
 * Inside the Flutter app the thread is handed to the native chat module; in a
 * plain browser it routes to `/chat/{id}`. Throws if the chat can't be created
 * (callers decide how to surface that — typically a silent no-op).
 */
export async function openDirectChat(
  router: NextRouter,
  recipientUserId: string,
  initialMessage?: string,
): Promise<void> {
  const { id } = await createDirectChat(recipientUserId, initialMessage);
  if (!openNativeChat(id)) {
    await router.push(`/chat/${id}`);
  }
}
