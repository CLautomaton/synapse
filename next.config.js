/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: false, // Explicitly enable PWA in all environments
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
  // Enable development mode features
  development: {
    enabled: true, // Enable service worker in development
    registerSwAfterLoad: true,
  },
  // Force PWA to be enabled in development
  forcePrecache: true,
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/synapse\.curiouscontent\.org\/[^/]+\/?$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'dynamic-routes-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24
        },
        networkTimeoutSeconds: 10,
        matchOptions: {
          ignoreSearch: true,
          ignoreVary: true
        },
        plugins: [
          {
            cacheKeyWillBeUsed: async ({request}) => {
              const url = new URL(request.url);
              const paramsToRemove = ['cr_user_id', 'endpoint'];
              paramsToRemove.forEach(param => {
                url.searchParams.delete(param);
              });
              return new Request(url.toString(), request);
            }
          }
        ]
      }
    },
    {
      urlPattern: /^https?:\/\/synapse\.curiouscontent\.org\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24
        },
        networkTimeoutSeconds: 10,
        matchOptions: {
          ignoreSearch: false,
          ignoreVary: false
        },
        plugins: [
          {
            cacheKeyWillBeUsed: async ({request}) => {
              const url = new URL(request.url);
              ['cr_user_id'].forEach(param => url.searchParams.delete(param));
              return new Request(url.toString(), request);
            }
          }
        ]
      }
    },
    {
      urlPattern: /\.(?:js|css|webp|jpg|jpeg|png|svg|gif|ico|woff2?)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 60 * 60 * 24 * 7
        }
      }
    },
    {
      urlPattern: /^https?:\/\/[^/]+\/_next\/data\/.+\/.+\.json$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-data',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 * 24
        }
      }
    },
    {
      urlPattern: /^https?:\/\/[^/]+\/_next\/.+$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 * 24
        }
      }
    }
  ]
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  
  images: {
    domains: ['synapse.curiouscontent.org'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp']
  },
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0'
          }
        ]
      }
    ];
  },
  
  experimental: {
    serverActions: {
      allowedOrigins: ['synapse.curiouscontent.org', 'localhost:3000']
    }
  }
};

module.exports = withPWA(nextConfig);