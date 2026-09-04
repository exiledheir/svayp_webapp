import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';
import http from 'http';
import { URL } from 'url';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { putUrl, contentType } = req.query;

  if (!putUrl || typeof putUrl !== 'string') {
    return res.status(400).json({ error: 'Missing putUrl query param' });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(putUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid putUrl' });
  }

  // Список хостов — защита от SSRF: без него ручка проксировала бы PUT на любой адрес,
  // включая внутренние. Локальный Azurite добавляется ТОЛЬКО когда бэкенд локальный,
  // поэтому в прод-сборке список остаётся прежним — один Azure.
  const backendOrigin = process.env.NEXT_PUBLIC_API_ORIGIN || '';
  const isLocalBackend = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(backendOrigin);
  const isAzure = parsedUrl.hostname.endsWith('.blob.core.windows.net');
  const isLocalBlob =
    isLocalBackend && (parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === 'localhost');
  if (!isAzure && !isLocalBlob) {
    return res.status(400).json({ error: 'putUrl must be an Azure Blob Storage URL' });
  }

  const ct = typeof contentType === 'string' ? contentType : 'application/octet-stream';
  const isHttps = parsedUrl.protocol === 'https:';
  const transport = isHttps ? https : http;

  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'PUT',
    headers: {
      'Content-Type': ct,
      'x-ms-blob-type': 'BlockBlob',
    } as Record<string, string>,
  };

  // Forward Content-Length if provided
  const cl = req.headers['content-length'];
  if (cl) options.headers['Content-Length'] = cl;

  await new Promise<void>((resolve, reject) => {
    const proxyReq = transport.request(options, (proxyRes) => {
      res.status(proxyRes.statusCode ?? 500);
      if (proxyRes.statusCode && proxyRes.statusCode >= 200 && proxyRes.statusCode < 300) {
        res.end();
      } else {
        let body = '';
        proxyRes.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        proxyRes.on('end', () => { res.end(body); });
      }
      resolve();
    });

    proxyReq.on('error', (err) => {
      res.status(502).json({ error: 'Blob upload failed', detail: err.message });
      reject(err);
    });

    req.pipe(proxyReq);
  });
}
