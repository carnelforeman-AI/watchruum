import type { NextConfig } from "next";

// Conservative security headers. The CSP intentionally does NOT restrict
// script-src/style-src (Next.js hydration + Tailwind inline styles need them and
// a strict policy risks breaking the app); instead it locks the directives that
// are safe and high-value: no plugins, no framing, no <base> hijack, forms only
// to same origin. React already escapes all user content, so XSS sinks are
// closed at the source.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ["base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'"].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
