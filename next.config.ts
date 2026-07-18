import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "assets.indolj.io",
      },
      {
        protocol: "https",
        hostname: "g-cdn.blinkco.io",
      },
    ],
  },
};

export default nextConfig;
