/** @type {import('next').NextConfig} */
const backendOrigin = process.env.NEXT_PUBLIC_API_ORIGIN || "https://app.svaypai.com";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // Product photos are immutable blobs — cache optimized variants for 31 days
    // so the server doesn't re-fetch/re-encode originals on every request.
    minimumCacheTTL: 2678400,
  },
  async rewrites() {
    return [
      {
        // Proxy all /proxy/* requests to the backend API v1, avoiding browser CORS.
        source: "/proxy/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
      {
        // Proxy all /proxy-v2/* requests to the backend API v2.
        source: "/proxy-v2/:path*",
        destination: `${backendOrigin}/api/v2/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
