/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',

  basePath: '/acuaponia', 
  assetPrefix: '/acuaponia/',

  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;