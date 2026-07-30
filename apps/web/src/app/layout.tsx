import type { Metadata } from 'next';
import './globals.css';
import { Geist, Fraunces } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AppProviders } from '@/providers/app-providers';
import { defaultMetadata } from '@/config/metadata';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

/**
 * Fraunces — a warm, soft-serif display face, distinct from the Geist
 * body font. Matches the "warm antique" design-token direction; used for
 * headings only (`--font-heading`, wired via globals.css's @theme block).
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  axes: ['opsz', 'SOFT'],
});

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn('font-sans', geist.variable, fraunces.variable)}
      suppressHydrationWarning
    >
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[var(--z-toast)] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-md"
        >
          Skip to content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
