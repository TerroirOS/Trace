/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // Prevent intermittent missing chunk/module errors during active editing.
    // Filesystem webpack cache has been unstable in this environment.
    if (dev) {
      config.cache = false;
    }
    return config;
  }
};

module.exports = nextConfig;
