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
        // Proxy all /proxy/* requests to the backend API, avoiding browser CORS.
        source: "/proxy/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
