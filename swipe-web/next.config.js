/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      {
        // Proxy all /proxy/* requests to the backend API, avoiding browser CORS.
        source: '/proxy/:path*',
        destination: 'https://app.svaypai.com/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
