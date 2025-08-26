/** @type {import('next').NextConfig} */

// Escribe el nombre exacto de tu repositorio de GitHub aquí
const repoName = 'acuaponia';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',

  assetPrefix: isProd ? `/${repoName}/` : undefined,
  basePath: isProd ? `/${repoName}` : undefined,

  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;