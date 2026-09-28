import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        // Cloudflare R2 public bucket URLs  (*.r2.dev)
        protocol: "https",
        hostname: "**.r2.dev",
        pathname: "/**",
      },
      {
        // Production API / media domain
        protocol: "https",
        hostname: "api.probae.in",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
