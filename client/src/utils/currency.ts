// Format currency from cents to CZK
export function formatCurrency(cents: number): string {
  const czk = cents / 100;
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(czk);
}

// Format currency from CZK (already in correct units)
export function formatCurrencyFromCZK(czk: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(czk);
}