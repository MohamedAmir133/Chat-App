/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracing: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:6000/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:6000/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
