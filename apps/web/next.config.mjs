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
};

export default withBundleAnalyzer(nextConfig);
