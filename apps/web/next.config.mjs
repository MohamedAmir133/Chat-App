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
    let rawBackendUrl = (process.env.BACKEND_URL || 'http://localhost:6000').trim();
    // Strip any accidental leading/trailing quotes
    rawBackendUrl = rawBackendUrl.replace(/^["']+|["']+$/g, '').trim();

    if (!rawBackendUrl) {
      rawBackendUrl = 'http://localhost:6000';
    }

    if (!rawBackendUrl.startsWith('http://') && !rawBackendUrl.startsWith('https://')) {
      rawBackendUrl = `https://${rawBackendUrl}`;
    }
    const backendUrl = rawBackendUrl.replace(/\/+$/, '');

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
