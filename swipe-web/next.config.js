/** @type {import('next').NextConfig} */
const backendOrigin = process.env.NEXT_PUBLIC_API_ORIGIN || "https://app.svaypai.com";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
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
