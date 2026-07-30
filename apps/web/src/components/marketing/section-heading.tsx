import { TextReveal } from '@/components/motion/text-reveal';
import { cn } from '@/lib/utils';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}

/** The one heading pattern every marketing section uses — eyebrow + word-by-word
 * scroll-reveal title + optional description. Not reused for the page-level H1
 * (`PageHero`/`HomeHero` own that, so there's exactly one H1 per page). */
function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  as = 'h2',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow ? (
        // `text-muted-foreground`, not `text-accent` — design-system.md's contrast table
        // only verifies `accent` against `background` at the 3:1 non-text/focus-indicator
        // threshold (3.30:1 in light mode), not the 4.5:1 normal-text threshold this label
        // actually needs. `muted-foreground` is verified at 4.5:1+ in both themes.
        <span className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          {eyebrow}
        </span>
      ) : null}
      <TextReveal
        as={as}
        text={title}
        className="font-heading text-3xl font-medium tracking-tight sm:text-4xl"
      />
      {description ? (
        <p className="text-muted-foreground max-w-2xl text-base sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}

export { SectionHeading };
