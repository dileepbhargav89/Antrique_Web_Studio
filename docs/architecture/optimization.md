# Production Optimization

Composes into the CI performance budget; respects the two-workload split.

- **Images:** AVIF/WebP, responsive srcset, edge transform, explicit dimensions
  (CLS), lazy below-fold, prioritized LCP image, blur-up.
- **Caching:** layered (CDN/ISR/Redis/HTTP-ETag/browser); private data never
  shared-cached.
- **Lazy loading:** defer everything not in first meaningful paint.
- **Code splitting:** route-based (marketing never ships portal JS), component-level
  for heavy pieces, vendor split. Marketing ships minimal client JS.
- **Prefetching:** in-viewport links, preload critical resources, bandwidth-aware.
- **Compression:** Brotli/gzip, pre-compressed at build, + minification.
- **CDN:** edge delivery near user, offloads origin, WAF/DDoS front line.
- **Server rendering:** SSG/ISR (marketing, best LCP) + SSR/streaming/partial
  hydration (portal responsiveness).
- **Database:** indexes from access patterns, connection pooling, cursor
  pagination, read replicas, partitioning for high-volume tables.
- **API:** no N+1, payload shaping, Redis cache, async via queue, ETags.
- **Bundle analysis:** analyzer + size budget gate CI; tree-shaking; audit heavy deps.

**Measured + gated:** RUM field CWV + Lighthouse/bundle budgets in CI. Optimization
enforced, not aspirational.
