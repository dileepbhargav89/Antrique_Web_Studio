import { QuoteIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Testimonial } from '@/content/testimonials';

export interface TestimonialCardProps {
  testimonial: Testimonial;
}

/** The "Sample Testimonial" badge is always visible in the card header — never hover-only —
 * so it can't be mistaken for a real quote even out of context. */
function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <QuoteIcon aria-hidden="true" className="text-accent/40 size-8 shrink-0" />
          <Badge variant="outline" className="h-5 shrink-0 px-2 text-[0.65rem]">
            Sample Testimonial
          </Badge>
        </div>
        <p className="text-foreground flex-1 text-sm">“{testimonial.quote}”</p>
        <div className="border-border/60 flex flex-col border-t pt-3">
          <span className="text-sm font-medium">{testimonial.author}</span>
          <span className="text-muted-foreground text-xs">{testimonial.role}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export { TestimonialCard };
