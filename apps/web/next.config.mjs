import withBundleAnalyzerInit from '@next/bundle-analyzer';

const withBundleAnalyzer = withBundleAnalyzerInit({ enabled: process.env.ANALYZE === 'true' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lean, self-contained server bundle for the Docker runtime image.
  output: 'standalone',
  // Phase 10, Module 2 (Frontend Performance). AVIF/WebP over the
  // framework default (WebP only) — smaller at equal quality, browsers
  // without AVIF support automatically fall back to WebP/original.
  // `remotePatterns` is a broad HTTPS allowlist (plus localhost/http for
  // local dev against MinIO) rather than a specific hostname: catalog
  // product images come from `StorageService`'s own configured bucket/CDN
  // (`STORAGE_PUBLIC_URL_BASE`, apps/api/.env.example), which is
  // deployment-specific and not knowable at this app's build time. Safe
  // to allow broadly because every image displayed here was uploaded
  // through this app's own admin product-image flow, not arbitrary
  // user-submitted URLs.
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
  // `lucide-react`/`@react-three/drei` are both large barrel-export
  // packages — this rewrites imports to only pull the specific
  // module each one actually uses, the standard Next.js fix for
  // barrel-file tree-shaking under-performing.
  experimental: {
    optimizePackageImports: ['lucide-react', '@react-three/drei'],
  },
  // Strips console.log/debug/info from the production client bundle
  // (error/warn kept — real signal, not debug noise). No effect in dev.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // Phase 10, Module 3 (Security Hardening) — apps/api's Helmet setup
  // (main.ts) only ever covers apps/api's own JSON responses; it never
  // touches anything apps/web serves (pages, static assets) — a real,
  // previously-undocumented gap found auditing this module. Unlike
  // apps/api (a JSON-only API, `default-src 'none'`), this app renders
  // real HTML/scripts/styles, so its CSP has to actually allow that:
  // `'self'` scripts/styles plus `'unsafe-inline'` for BOTH — the App
  // Router's own inline RSC-streaming/hydration scripts need the
  // script-src one (see the `headers()` function's own comment for the
  // live-verified blank-page failure this caused before it was added),
  // Tailwind/shadcn's inline style attributes need the style-src one.
  // A nonce-based strict CSP would be the tighter alternative but needs
  // per-request nonce plumbing through every `<Script>`/inline style this
  // app doesn't have today — tracked as a follow-up, not attempted under
  // this module's time budget. `connect-src`
  // includes the API origin (browser calls apps/api directly with a
  // Bearer token for most data — see `services/api/interceptors.ts` —
  // not proxied through this app, except the few `/api/auth/*` BFF
  // routes) — derived from `NEXT_PUBLIC_API_BASE_URL` since the real
  // origin is deployment-specific, not knowable at this file's build
  // time (same reasoning as `images.remotePatterns` above).
  async headers() {
    const apiOrigin = (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? '').origin;
      } catch {
        return "'self'";
      }
    })();

    // `'unsafe-inline'` on script-src is REQUIRED, not a leftover — the
    // App Router streams RSC payloads and Suspense-reveal calls via
    // inline `<script>self.__next_f.push(...)</script>` tags on every
    // page; without this, that inline script is silently blocked, the
    // hydration/streaming-reveal mechanism never runs, and every route
    // renders a permanently blank page (`hidden=""` on the root wrapper
    // never gets removed) — confirmed live: an earlier version of this
    // CSP (script-src 'self' only, no 'unsafe-inline') shipped a
    // completely blank app with zero console errors, caught only by
    // live browser verification, not `next build`/curl (which don't
    // execute client JS) — see decisions.md's 2026-07-30 CSP entry.
    // `'unsafe-eval'` is scoped to development only (webpack HMR's own
    // fast-refresh mechanism needs it); production doesn't.
    const scriptSrc =
      process.env.NODE_ENV === 'production'
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: http:",
      "font-src 'self' data:",
      `connect-src 'self' ${apiOrigin}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ');

    const securityHeaders = [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // Effective once TLS terminates upstream in production, same
      // caveat main.ts's own HSTS comment documents for apps/api.
      { key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains' },
    ];

    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withBundleAnalyzer(nextConfig);
