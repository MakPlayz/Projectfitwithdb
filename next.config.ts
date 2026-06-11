import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['unconsigned-marquita-noninterruptive.ngrok-free.dev'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      }
    ],
  },
};

export default nextConfig;
