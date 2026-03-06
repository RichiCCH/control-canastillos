import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida independiente y minimizada (ideal para Azure/Docker)
  output: 'standalone',

  // Compilación más rápida (quita logs en producción)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },

  // Reduce el tamaño del bundle
  poweredByHeader: false,

  // Compresión
  compress: true,

  // Imágenes optimizadas
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 3600,
  },

  // Excluir carpetas legacy del build de TypeScript
  typescript: {
    ignoreBuildErrors: false,
  },

  // Headers de seguridad y caché para assets estáticos
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
