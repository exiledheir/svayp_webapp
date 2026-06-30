import type { NextApiRequest, NextApiResponse } from 'next';

// Block requests to private/loopback addresses (SSRF protection)
const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  // NOTE: do not rewrite %2F here — SAS-signed URLs carry encoded slashes in
  // their signature, and "fixing" those would corrupt the signature. Encoded
  // slashes in a blob path are normalized at the source (see feed/create.tsx).
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  if (parsed.protocol !== 'https:') {
    res.status(400).json({ error: 'Only HTTPS URLs are allowed' });
    return;
  }

  const hostname = parsed.hostname;
  if (PRIVATE_HOSTNAME_PATTERNS.some((p) => p.test(hostname))) {
    res.status(403).json({ error: 'Private addresses are not allowed' });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'SvaypApp/1.0' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      res.status(response.status).end();
      return;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      res.status(400).json({ error: 'URL does not point to an image' });
      return;
    }

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(Buffer.from(buffer));
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    res.status(isAbort ? 504 : 502).json({ error: 'Failed to fetch image' });
  }
}
