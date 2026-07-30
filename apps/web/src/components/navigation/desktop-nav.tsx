import type { NavItem } from '@/types/navigation';
import { cn } from '@/lib/utils';
import { NavLink } from './nav-link';

export interface DesktopNavProps {
  items: NavItem[];
  collapsed?: boolean;
  className?: string;
}

/**
 * Renders inside `Sidebar`'s children slot (`components/layout/sidebar.tsx`). `collapsed`
 * only hides labels visually (`sr-only`, not removed from the DOM) — screen readers and
 * keyboard users still get the full label regardless of the icon-only visual state.
 */
function DesktopNav({ items, collapsed = false, className }: DesktopNavProps) {
  return (
    <nav aria-label="Portal navigation" className={cn('flex flex-col gap-1', className)}>
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          hideLabel={collapsed}
          className={cn(collapsed && 'justify-center')}
        />
      ))}
    </nav>
  );
}

export { DesktopNav };
