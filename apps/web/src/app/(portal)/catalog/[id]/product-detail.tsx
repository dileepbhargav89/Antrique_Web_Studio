'use client';

import Image from 'next/image';
import Link from 'next/link';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ROUTES } from '@/config/routes';
import { useProductCustomizationForProduct } from '@/features/bespoke/hooks/use-bespoke';
import { useProduct } from '@/features/catalog/hooks/use-products';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatCurrency } from '@/utils/currency';
import type { ProductStatus } from '@/types/api/catalog';

const STATUS_TONE: Record<ProductStatus, StatusTone> = {
  DRAFT: 'muted',
  PUBLISHED: 'success',
  ARCHIVED: 'warning',
};

/** Variant `price` arrives as a `Decimal.toString()` numeric string, not a `number`. */
function formatPrice(price: string): string {
  const amount = Number(price);
  return Number.isFinite(amount) ? formatCurrency(amount) : price;
}

interface ProductDetailProps {
  id: string;
}

function ProductDetail({ id }: ProductDetailProps) {
  const { data: product, isLoading, error, refetch } = useProduct(id);
  const customizationQuery = useProductCustomizationForProduct(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-20 w-full max-w-2xl" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    const { title, description } = getErrorCopy(normalizeError(error));
    return <ErrorState title={title} description={description} onRetry={() => refetch()} />;
  }

  if (!product) return null;

  return (
    <div className="flex flex-col gap-8">
      <DetailPageHeader
        title={product.name}
        subtitle={product.slug}
        status={<StatusBadge label={product.status} tone={STATUS_TONE[product.status]} />}
        actions={
          customizationQuery.data ? (
            <Button asChild>
              <Link href={`${ROUTES.portal.bespokeCustomize}/${id}`}>Customize & order</Link>
            </Button>
          ) : null
        }
      />

      {product.description ? (
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          {product.description}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Variants</h2>
        {product.variants && product.variants.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-mono text-xs">{variant.sku}</TableCell>
                    <TableCell>{variant.name ?? '—'}</TableCell>
                    <TableCell>{formatPrice(variant.price)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={variant.isActive ? 'Active' : 'Inactive'}
                        tone={variant.isActive ? 'success' : 'muted'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState title="No variants." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Images</h2>
        {product.images && product.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {product.images.map((image) => (
              // Phase 10, Module 2 (Frontend Performance) — next.config.mjs
              // now allowlists any HTTPS host (StorageService's bucket/CDN
              // is deployment-specific, not knowable at build time; see
              // that config's own comment), so this can be next/image.
              <div key={image.id} className="relative aspect-square w-full">
                <Image
                  src={image.url}
                  alt={image.altText ?? ''}
                  fill
                  loading="lazy"
                  sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="rounded-lg border object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No images." />
        )}
      </section>
    </div>
  );
}

export { ProductDetail };
