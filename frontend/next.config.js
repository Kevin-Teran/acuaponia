/** @type {import('next').NextConfig} */
const repoName = 'acuaponia';
const isProd = process.env.NODE_ENV === 'production';
const nextConfig = {
  output: 'export',
  assetPrefix: isProd ? `/${repoName}/` : undefined,
  basePath: isProd ? `/${repoName}` : undefined,
  images: { unoptimized: true },
};
module.exports = nextConfig;