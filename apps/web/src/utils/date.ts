const DEFAULT_LOCALE = 'en-IN';

export function formatDate(date: Date | string, locale: string = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(date));
}

export function formatDateTime(date: Date | string, locale: string = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(date),
  );
}

export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}
