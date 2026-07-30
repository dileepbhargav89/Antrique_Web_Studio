import { cn } from '@/lib/utils';

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  start?: React.ReactNode;
  end?: React.ReactNode;
  /** `compact` drops the vertical padding, for use inside the portal shell where the
   * marketing footer's full presence would compete with the sidebar for visual weight. */
  variant?: 'default' | 'compact';
}

/** Structural shell only — no business links, no copyright text. A future page composes
 * its own content into the slots below, the same pattern as `Navbar`/`Sidebar`. */
function Footer({ start, end, variant = 'default', className, ...props }: FooterProps) {
  return (
    <footer
      className={cn(
        'border-border bg-background border-t',
        variant === 'default' ? 'py-8' : 'py-3',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6 lg:px-8">
        {start}
        {end}
      </div>
    </footer>
  );
}

export { Footer };
