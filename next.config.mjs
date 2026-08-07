/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent webpack from bundling these server-only packages into client/edge bundles
    serverComponentsExternalPackages: [
      "@prisma/adapter-pg",
      "pg",
      "pg-pool",
    ],
  },
  webpack: (config) => {
    // Suppress optional pg-native warning
    if (Array.isArray(config.externals)) {
      config.externals.push({ "pg-native": "pg-native" });
    }
    return config;
  },
};

export default nextConfig;
