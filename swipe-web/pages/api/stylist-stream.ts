import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';
import http from 'http';

/**
 * Потоковый ответ Nur, проброшенный к бэкенду вручную.
 *
 * <p><b>Зачем отдельный роут.</b> Обычный путь `/proxy/*` — это `rewrites` Next, и он
 * копит SSE в буфере: браузер получал весь ответ одним чтением в самом конце, то есть
 * стриминг был виден только в curl, а в чате текст появлялся разом. Здесь поток
 * форвардится через `pipe` с отключённой буферизацией и уходит по кускам.
 *
 * <p>Соседний `sse-proxy.ts` не подошёл: он GET-only под `EventSource` и носит токен в
 * query. Здесь POST с телом, а токен идёт заголовком — в логи и историю он не попадает.
 */

export const config = {
  api: {
    // Тело читаем сами и передаём дальше как есть: разбирать его тут незачем.
    bodyParser: false,
    responseLimit: false,
  },
};

const backendOrigin = process.env.NEXT_PUBLIC_API_ORIGIN || 'https://app.svaypai.com';

/** Тело запроса целиком. Оно маленькое — текст сообщения и пара полей. */
function readBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Missing token' });
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(backendOrigin);
  } catch {
    return res.status(500).json({ error: 'Invalid backend origin configuration' });
  }

  const body = await readBody(req);
  const isHttps = parsedOrigin.protocol === 'https:';
  const transport = isHttps ? https : http;

  const proxyReq = transport.request(
    {
      hostname: parsedOrigin.hostname,
      port: parsedOrigin.port || (isHttps ? 443 : 80),
      path: '/api/v1/stylist/messages/stream',
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        'Content-Length': body.length,
        Accept: 'text/event-stream',
      },
    },
    (proxyRes) => {
      // 409 «поток не поддерживается» пробрасываем как есть: клиент по нему уходит
      // на обычную ручку, а не показывает ошибку.
      if (proxyRes.statusCode !== 200) {
        res.status(proxyRes.statusCode ?? 502).end();
        proxyRes.resume();
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      // Для прокси перед приложением (nginx на проде): иначе он соберёт поток обратно
      // в буфер, и пользователь снова увидит ответ разом.
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      proxyRes.pipe(res);
      req.on('close', () => {
        proxyReq.destroy();
        proxyRes.destroy();
      });
    },
  );

  proxyReq.on('error', () => {
    if (!res.headersSent) res.status(502).end();
    else res.end();
  });

  proxyReq.write(body);
  proxyReq.end();
}
