import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      const existingIgnored = config.watchOptions?.ignored;

      config.cache = false;
      config.watchOptions = {
        ...(config.watchOptions ?? {}),
        ignored: [
          ...(Array.isArray(existingIgnored)
            ? existingIgnored
            : existingIgnored
              ? [existingIgnored]
              : []).filter((pattern) => typeof pattern === "string" && pattern.length > 0),
          "**/mhg-website/**",
          "**/Website/**",
        ],
      };
    }

    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(process.cwd()),
    };

    return config;
  },
};

export default nextConfig;
