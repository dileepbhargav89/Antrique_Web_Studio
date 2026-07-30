import { SERVICE_CLUSTERS, type ServiceCluster } from '@/content/services';

/**
 * Async on purpose — see `case-studies.repository.ts`'s comment for the full reasoning.
 * These are Antrique's own agency service offerings (Custom Website Design, E-Commerce
 * Development, etc.) — unrelated to the backend's `products`/`categories`/`collections`
 * endpoints, which back the multi-tenant catalog product this platform actually is, not
 * Antrique's own service list. No backend concept of "agency services" exists.
 */
export async function getServiceClusters(): Promise<ServiceCluster[]> {
  return SERVICE_CLUSTERS;
}
