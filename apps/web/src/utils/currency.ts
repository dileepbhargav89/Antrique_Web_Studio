const DEFAULT_LOCALE = 'en-IN';
const DEFAULT_CURRENCY = 'INR';

/** Amount is a plain number of major units (e.g. rupees, not paise). */
export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}
