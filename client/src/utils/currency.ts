// Format currency from cents to CZK
export function formatCurrency(cents: number): string {
  const czk = cents / 100;
  
  // For whole amounts, don't show decimals
  if (czk % 1 === 0) {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(czk);
  }
  
  // For amounts with decimals, show them
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(czk);
}

// Format currency from CZK (already in correct units)
export function formatCurrencyFromCZK(czk: number): string {
  // For whole amounts, don't show decimals
  if (czk % 1 === 0) {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(czk);
  }
  
  // For amounts with decimals, show them
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(czk);
}