const DEFAULT_LOCALE = 'en-IN';

export function formatNumber(value: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(
  value: number,
  locale: string = DEFAULT_LOCALE,
  fractionDigits = 0,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
