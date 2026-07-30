'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { PORTAL_NAV_ITEMS } from '@/config/navigation';
import { ROUTES } from '@/config/routes';

/** Segments that are initialisms, not regular words — title-casing alone would produce
 * "Crm" instead of "CRM". */
const ACRONYM_SEGMENTS: Record<string, string> = { crm: 'CRM' };

function labelForSegment(segment: string): string {
  const known = PORTAL_NAV_ITEMS.find((item) => item.href === `/${segment}`);
  if (known) return known.label;
  if (ACRONYM_SEGMENTS[segment]) return ACRONYM_SEGMENTS[segment];
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Built from `usePathname()`, not a per-page prop — every portal page gets a correct
 * trail for free. Segment labels come from `PORTAL_NAV_ITEMS` where available (the
 * top-level portal sections); a deeper segment (a future business page's own sub-route,
 * e.g. a project id) falls back to a title-cased version of the URL segment itself.
 */
function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={ROUTES.portal.dashboard}>Portal</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;
          return (
            <Fragment key={href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="truncate">{labelForSegment(segment)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{labelForSegment(segment)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export { Breadcrumbs };
