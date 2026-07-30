import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusTone = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';

export interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  className?: string;
}

// `--color-success`/`--color-warning`/`--color-info` (+ `-foreground`) are registered in
// `app/globals.css`'s `@theme inline` block, so these are real Tailwind utility classes,
// not raw CSS custom properties.
const TONE_CLASSES: Record<StatusTone, string> = {
  default: 'bg-primary/10 text-primary border-transparent',
  success: 'bg-success/15 text-success border-transparent',
  warning: 'bg-warning/15 text-warning border-transparent',
  destructive: 'bg-destructive/10 text-destructive border-transparent',
  info: 'bg-info/15 text-info border-transparent',
  muted: 'bg-muted text-muted-foreground border-transparent',
};

/**
 * One status pill for every module (Order/Invoice/Payment/Lead/FollowUp/Warehouse/Supplier
 * status, derived Inventory stock level) — each caller supplies its own enum→tone mapping;
 * this component only owns the tone→class table.
 */
function StatusBadge({ label, tone = 'default', className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[tone], className)}>
      {label}
    </Badge>
  );
}

export { StatusBadge };
