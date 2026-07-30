import { cn } from '@/lib/utils';

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  collapsed?: boolean;
}

/** Structural shell only — no nav items. `collapsed` is a controlled visual prop; the
 * open/closed STATE itself belongs in a future feature's own store (see store/README.md),
 * not baked in here. */
function Sidebar({
  header,
  footer,
  collapsed = false,
  className,
  children,
  ...props
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'border-border bg-sidebar text-sidebar-foreground flex h-full flex-col border-r transition-[width] duration-(--duration-base)',
        collapsed ? 'w-16' : 'w-64',
        className,
      )}
      {...props}
    >
      {header ? <div className="border-border border-b p-3">{header}</div> : null}
      <nav className="flex-1 overflow-y-auto p-3">{children}</nav>
      {footer ? <div className="border-border border-t p-3">{footer}</div> : null}
    </aside>
  );
}

export { Sidebar };
