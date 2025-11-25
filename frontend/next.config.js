/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'api.yourdomain.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Disable image optimization in development to avoid 404 errors
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost',
    NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000',
    NEXT_PUBLIC_PRODUCTS_URL: process.env.NEXT_PUBLIC_PRODUCTS_URL || 'http://localhost:3001',
    NEXT_PUBLIC_CATEGORIES_URL: process.env.NEXT_PUBLIC_CATEGORIES_URL || 'http://localhost:3002',
    NEXT_PUBLIC_USERS_URL: process.env.NEXT_PUBLIC_USERS_URL || 'http://localhost:3003',
    NEXT_PUBLIC_ORDERS_URL: process.env.NEXT_PUBLIC_ORDERS_URL || 'http://localhost:3004',
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true,
      },
    ];
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Custom webpack config
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  // Production optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Enable standalone output for Docker
  output: 'standalone',

  // Experimental features
  experimental: {
    optimizePackageImports: ['react-icons', 'date-fns'],
  },
};

// Bundle analyzer (optional)
let finalConfig = nextConfig;

if (process.env.ANALYZE === 'true') {
  try {
    const withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    });
    finalConfig = withBundleAnalyzer(nextConfig);
  } catch (e) {
    console.warn('Bundle analyzer not available, using base config');
  }
}

module.exports = finalConfig;
