import Link from 'next/link';
import { CheckIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/config/routes';
import type { PricingTier } from '@/content/pricing-tiers';

export interface PricingTierCardProps {
  tier: PricingTier;
}

function PricingTierCard({ tier }: PricingTierCardProps) {
  return (
    <Card className={tier.featured ? 'ring-accent ring-2' : undefined}>
      <CardHeader className="gap-2">
        {tier.featured ? (
          <Badge className="w-fit" variant="default">
            Most popular
          </Badge>
        ) : null}
        <CardTitle className="text-xl">{tier.name}</CardTitle>
        <p className="text-muted-foreground text-sm">{tier.tagline}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm font-medium">{tier.bestFor}</p>
        <ul className="flex flex-col gap-2">
          {tier.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <CheckIcon aria-hidden="true" className="text-accent mt-0.5 size-4 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={ROUTES.marketing.quote}>Get a Quote</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export { PricingTierCard };
