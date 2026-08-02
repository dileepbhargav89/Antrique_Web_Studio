import { cn } from '@/lib/utils';

export type WordmarkProps = React.HTMLAttributes<HTMLSpanElement>;

/**
 * "ANTRIQUE / — WEB STUDIO —" two-line lockup, sized to align vertically
 * with `Logo`'s 36–44px mark (see the navbar composition in
 * `app/(marketing)/layout.tsx`, the only current consumer). Plain text, no
 * SVG — `aria-hidden` is left off deliberately: this carries the visible
 * "Antrique" name, and the parent link's `aria-label` only needs to exist
 * alongside it, not replace it, so the brand name stays in the accessible
 * name even if that `aria-label` is ever removed.
 */
function Wordmark({ className, ...props }: WordmarkProps) {
  return (
    <span className={cn('flex flex-col justify-center leading-none', className)} {...props}>
      <span className="text-accent font-sans text-lg font-bold tracking-wide">ANTRIQUE</span>
      <span className="text-accent/70 mt-1 font-sans text-[10px] font-medium tracking-[0.3em]">
        — WEB STUDIO —
      </span>
    </span>
  );
}

export { Wordmark };
