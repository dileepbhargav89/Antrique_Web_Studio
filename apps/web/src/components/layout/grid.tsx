import { cn } from '@/lib/utils';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Column count at each tier — mirrors the 5-tier responsive convention (config/breakpoints.ts). */
  cols?: {
    mobile?: number;
    tablet?: number;
    laptop?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

const GAP_CLASS: Record<NonNullable<GridProps['gap']>, string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const COL_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
};

const TABLET_COL_CLASS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  6: 'sm:grid-cols-6',
  12: 'sm:grid-cols-12',
};

const LAPTOP_COL_CLASS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  6: 'lg:grid-cols-6',
  12: 'lg:grid-cols-12',
};

const DESKTOP_COL_CLASS: Record<number, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  6: 'xl:grid-cols-6',
  12: 'xl:grid-cols-12',
};

export function Grid({ className, cols, gap = 'md', ...props }: GridProps) {
  return (
    <div
      className={cn(
        'grid',
        GAP_CLASS[gap],
        cols?.mobile && COL_CLASS[cols.mobile],
        cols?.tablet && TABLET_COL_CLASS[cols.tablet],
        cols?.laptop && LAPTOP_COL_CLASS[cols.laptop],
        cols?.desktop && DESKTOP_COL_CLASS[cols.desktop],
        className,
      )}
      {...props}
    />
  );
}
