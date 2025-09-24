/** @type {import('next').NextConfig} */
const path = require('path');
const repoName = 'acuaponia';
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  assetPrefix: isProd ? `/${repoName}/` : undefined,
  basePath: isProd ? `/${repoName}` : undefined,
  images: { unoptimized: true },
  outputFileTracingRoot: path.join(__dirname, '../'),
  transpilePackages: ['date-fns-tz']
};

module.exports = nextConfig;