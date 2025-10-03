/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurar basePath para que los assets se carguen desde /acuaponia
  basePath: '/acuaponia',

  // Prefijo para assets estáticos
  assetPrefix: '/acuaponia',

  // Configuración para producción
  trailingSlash: false,

  // Configuración de imágenes
  images: {
    unoptimized: true, // importante en VPS si no configuras image-optimizer
    domains: ['tesorostpatl.com.co'], // habilita imágenes de tu dominio
  },

  // Reescrituras (opcional)
  async rewrites() {
    return [
      // ejemplo: /dashboard/* -> /acuaponia/dashboard/*
      {
        source: '/dashboard/:path*',
        destination: '/acuaponia/dashboard/:path*'
      }
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

export default nextConfig