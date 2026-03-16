import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // eslint აქ აღარ გვინდა, წავშალეთ
};

export default nextConfig;