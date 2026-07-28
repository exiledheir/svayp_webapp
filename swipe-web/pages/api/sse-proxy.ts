import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';
import http from 'http';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_PATH_PREFIXES = [
  '/wardrobe/uploads/',
  '/outfits/try-on/',
  // Киоск в зале магазина: у него нет пользователя и JWT — устройство
  // авторизуется ключом (см. kioskKey ниже).
  '/kiosk/looks/',
];

const backendOrigin = process.env.NEXT_PUBLIC_API_ORIGIN || 'https://app.svaypai.com';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path, token, kioskKey } = req.query;

  const backendPath = typeof path === 'string' ? path : '';
  const accessToken = typeof token === 'string' ? token : '';
  // EventSource не умеет слать заголовки, поэтому ключ киоска приходит параметром
  // и превращается в X-Kiosk-Key уже здесь, на сервере.
  const deviceKey = typeof kioskKey === 'string' ? kioskKey : '';

  const isAllowed = ALLOWED_PATH_PREFIXES.some((prefix) => backendPath.startsWith(prefix));
  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden path' });
  }

  const isKiosk = backendPath.startsWith('/kiosk/');
  if (!accessToken && !(isKiosk && deviceKey)) {
    return res.status(401).json({ error: 'Missing token' });
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(backendOrigin);
  } catch {
    return res.status(500).json({ error: 'Invalid backend origin configuration' });
  }

  const isHttps = parsedOrigin.protocol === 'https:';
  const transport = isHttps ? https : http;
  const port = parsedOrigin.port || (isHttps ? 443 : 80);

  const options = {
    hostname: parsedOrigin.hostname,
    port,
    path: `/api/v1${backendPath}`,
    method: 'GET',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(isKiosk && deviceKey ? { 'X-Kiosk-Key': deviceKey } : {}),
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const proxyReq = transport.request(options, (proxyRes) => {
    if (proxyRes.statusCode !== 200) {
      res.status(proxyRes.statusCode ?? 502).end();
      return;
    }
    proxyRes.pipe(res);
    req.on('close', () => {
      proxyReq.destroy();
      proxyRes.destroy();
    });
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.status(502).end();
    } else {
      res.end();
    }
  });

  proxyReq.end();
}
