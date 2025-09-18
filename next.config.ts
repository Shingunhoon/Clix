import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
 async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "img-src 'self' data: https://docs.google.com https://drive.google.com https://firebasestorage.googleapis.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
