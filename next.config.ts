import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
    '192.168.1.15',
    '192.168.1.15:3000',
    '192.168.29.160',
    '192.168.29.160:3000',
  ],
  devIndicators: false,
};

export default nextConfig;
