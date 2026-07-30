import { clientEnv } from './env';

export const appConfig = {
  name: 'Antrique Web Studio',
  description:
    'Full-service web agency platform — marketing site, client portal, and admin console.',
  siteUrl: clientEnv.NEXT_PUBLIC_SITE_URL,
  defaultLocale: 'en',
} as const;
