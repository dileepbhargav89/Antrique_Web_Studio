import type { LucideIcon } from 'lucide-react';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/ui/animated-counter';

export interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  /** Positive = upward trend (styled success), negative = downward (styled destructive). Omit for no trend. */
  trend?: number;
  trendLabel?: string;
  className?: string;
}

function StatsCard({ label, value, icon: Icon, trend, trendLabel, className }: StatsCardProps) {
  const hasTrend = typeof trend === 'number';
  const isPositive = hasTrend && trend >= 0;

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-muted-foreground text-sm font-normal">{label}</CardTitle>
        {Icon ? <Icon aria-hidden="true" className="text-muted-foreground size-4" /> : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">
          <AnimatedCounter value={value} />
        </div>
        {hasTrend ? (
          <p
            className={cn(
              'mt-1 flex items-center gap-1 text-xs',
              isPositive ? 'text-success' : 'text-destructive',
            )}
          >
            {isPositive ? (
              <ArrowUpIcon aria-hidden="true" className="size-3" />
            ) : (
              <ArrowDownIcon aria-hidden="true" className="size-3" />
            )}
            {Math.abs(trend).toString()}%{trendLabel ? ` ${trendLabel}` : ''}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { StatsCard };
