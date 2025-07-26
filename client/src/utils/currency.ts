/**
 * Format cents to CZK with proper Czech formatting
 * @param cents Amount in cents
 * @returns Formatted string like "1 430 CZK"
 */
export function formatCurrency(cents: number): string {
  const czk = Math.floor(cents / 100);
  return czk.toLocaleString("cs-CZ").replace(/\s/g, "\u00A0") + "\u00A0CZK";
}

/**
 * Parse CZK string to cents
 * @param czkString String like "1 430 CZK"
 * @returns Amount in cents
 */
export function parseCurrency(czkString: string): number {
  const number = parseInt(czkString.replace(/[^\d]/g, ""));
  return isNaN(number) ? 0 : number * 100;
}

/**
 * Format amount with proper spacing for display
 * @param amount Number to format
 * @returns Formatted string with non-breaking spaces
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString("cs-CZ").replace(/\s/g, "\u00A0");
}

/**
 * Validate that amount is a positive integer in CZK
 * @param amount Amount to validate
 * @returns true if valid
 */
export function isValidCZKAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

/**
 * Convert CZK to cents safely
 * @param czk Amount in CZK
 * @returns Amount in cents
 */
export function czkToCents(czk: number): number {
  return Math.round(czk * 100);
}

/**
 * Convert cents to CZK safely
 * @param cents Amount in cents
 * @returns Amount in CZK
 */
export function centsToCzk(cents: number): number {
  return Math.round(cents) / 100;
}
