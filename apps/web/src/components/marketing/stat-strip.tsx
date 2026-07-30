import { Grid } from '@/components/layout/grid';
import { StatsCard } from '@/components/ui/stats-card';
import type { EngineeringStat } from '@/content/engineering-stats';

export interface StatStripProps {
  stats: EngineeringStat[];
}

/** Wraps the existing `StatsCard` primitive in a responsive grid — no bespoke stat-card
 * markup. See `content/engineering-stats.ts` for why these are engineering facts, not
 * client-traction numbers. */
function StatStrip({ stats }: StatStripProps) {
  return (
    <Grid cols={{ mobile: 1, tablet: 2, laptop: 4 }} gap="md">
      {stats.map((stat) => (
        <StatsCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
      ))}
    </Grid>
  );
}

export { StatStrip };
