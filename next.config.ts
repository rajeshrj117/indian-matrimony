import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve /.well-known/assetlinks.json from public/well-known/assetlinks.json
  async rewrites() {
    return [
      {
        source: "/.well-known/assetlinks.json",
        destination: "/well-known/assetlinks.json",
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Camera is needed for verification selfies, geolocation for nearby discovery.
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
        ],
      },
      // Digital Asset Links must be served as JSON.
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      // Static artwork: let browsers reuse it between visits instead of re-checking every load.
      {
        source: "/:dir(onboarding|icons)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      {
        source: "/logo.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default