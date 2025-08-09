// Format currency from cents to CZK
export function formatCurrency(cents: number): string {
  const czk = cents / 100;
  const formatted = new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(czk);
  
  // Replace the comma decimal separator with space + "00" for zero decimals
  return formatted.replace(',00', ' 00');
}

// Format currency from CZK (already in correct units)
export function formatCurrencyFromCZK(czk: number): string {
  const formatted = new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(czk);
  
  // Replace the comma decimal separator with space + "00" for zero decimals
  return formatted.replace(',00', ' 00');
}