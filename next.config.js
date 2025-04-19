// Default Next.js config for fully dynamic, API-driven builds

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No static export. No output: 'export'. SSR/ISR/App router/API enabled.
};

module.exports = nextConfig;
