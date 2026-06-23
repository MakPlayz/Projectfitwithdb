import type { NextConfig } from "next";

// Derive the Supabase origin (if available at build time) so we can scope
// connect-src instead of allowing all of *.supabase.co.
const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
})();

// Content-Security-Policy.
// NOTE (phase 1): 'unsafe-inline' is currently required for scripts/styles
// because the Next.js App Router injects inline bootstrap scripts and several
// libraries (framer-motion/motion, gsap) inject inline styles. This still
// gives meaningful protection (no eval, tight img/connect/object/frame rules,
// clickjacking protection). Harden later by switching to a nonce-based policy
// and dropping 'unsafe-inline' from script-src.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  [
    "img-src 'self' data: blob:",
    "https://images.unsplash.com https://plus.unsplash.com",
    "https://maps.googleapis.com https://maps.gstatic.com",
    "https://*.googleapis.com https://*.ggpht.com",
    supabaseOrigin ?? "https://*.supabase.co",
  ].join(" "),
  [
    "connect-src 'self'",
    "https://maps.googleapis.com",
    supabaseOrigin ?? "https://*.supabase.co",
  ].join(" "),
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
];

const nextConfig: NextConfig = {
  // Remove the X-Powered-By: Next.js header (fingerprinting).
  poweredByHeader: false,
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
  async headers() {
    return [
      {
        // Apply security headers to every route.
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
