import { getToken } from '@/lib/auth';
import type { SseHandle } from '@/types';

export type { SseHandle };

interface WatchOptions<TProgress, TFinal> {
  sseUrl: string;
  fallbackPoll: () => Promise<TFinal>;
  onProgress: (data: TProgress) => void;
  onDone: (data: TFinal) => void;
  onError: (err: Error) => void;
  isTerminal: (data: TProgress) => boolean;
  toFinal: (data: TProgress) => TFinal;
  timeoutMs: number;
}

function buildSseProxyUrl(backendPath: string): string {
  const token = getToken();
  const params = new URLSearchParams({ path: backendPath });
  if (token) params.set('token', token);
  return `/api/sse-proxy?${params.toString()}`;
}

export function watchWithSse<TProgress, TFinal>(
  opts: WatchOptions<TProgress, TFinal>,
): SseHandle {
  if (typeof EventSource === 'undefined') {
    opts.fallbackPoll().then(opts.onDone).catch(opts.onError);
    return { close: () => {} };
  }

  let es: EventSource | null = null;
  let closed = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT = 3;

  function cleanup() {
    closed = true;
    if (timeoutId !== null) clearTimeout(timeoutId);
    es?.close();
    es = null;
  }

  function connect() {
    if (closed) return;
    const url = buildSseProxyUrl(opts.sseUrl);
    es = new EventSource(url);

    es.onmessage = (event: MessageEvent) => {
      reconnectAttempts = 0;
      try {
        const data = JSON.parse(event.data as string) as TProgress;
        opts.onProgress(data);
        if (opts.isTerminal(data)) {
          cleanup();
          opts.onDone(opts.toFinal(data));
        }
      } catch {
        // malformed event — keep stream open
      }
    };

    es.onerror = () => {
      es?.close();
      es = null;
      if (closed) return;
      if (reconnectAttempts >= MAX_RECONNECT) {
        cleanup();
        opts.fallbackPoll().then(opts.onDone).catch(opts.onError);
        return;
      }
      const delay = Math.pow(2, reconnectAttempts) * 1000;
      reconnectAttempts++;
      setTimeout(connect, delay);
    };
  }

  timeoutId = setTimeout(() => {
    if (!closed) {
      cleanup();
      // SSE timed out — fall back to polling instead of erroring out so the
      // user stays in "processing" state and sees the result when it arrives.
      opts.fallbackPoll().then(opts.onDone).catch(opts.onError);
    }
  }, opts.timeoutMs);

  connect();
  return { close: cleanup };
}
