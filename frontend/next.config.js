/** @type {import('next').NextConfig} */
const path = require('path');
const repoName = 'acuaponia';
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  async rewrites() {
    const apiProtocol = process.env.NEXT_PUBLIC_API_PROTOCOL || 'http';
    const apiHost = process.env.NEXT_PUBLIC_API_HOST || 'localhost';
    const apiPort = process.env.NEXT_PUBLIC_API_PORT || '5001'; 
    const backendBaseUrl = `${apiProtocol}://${apiHost}:${apiPort}/api`;

    return [
      {
        source: '/api/:path*',
        destination: `${backendBaseUrl}/:path*`,
      },
    ];
  },

  assetPrefix: isProd ? `/${repoName}/` : undefined,
  basePath: isProd ? `/${repoName}` : undefined,
  images: { unoptimized: true },
  outputFileTracingRoot: path.join(__dirname, '../'),
  transpilePackages: ['date-fns-tz']
};

module.exports = nextConfig;