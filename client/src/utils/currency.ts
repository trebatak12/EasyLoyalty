export function formatCurrency(amount: number): string {
  const czk = Math.floor(amount / 100);
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(czk);
}