/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase serverless function timeout for scraping
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
};

module.exports = nextConfig;
