const kesFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const kesFormatterWithDecimals = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-KE", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-KE", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatKES(amount: number, decimals = false): string {
  return decimals ? kesFormatterWithDecimals.format(amount) : kesFormatter.format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-KE").format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return dateFormatter.format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return dateTimeFormatter.format(d);
}

export function formatCompactKES(amount: number): string {
  if (amount >= 1_000_000) return `KSh ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `KSh ${(amount / 1_000).toFixed(1)}K`;
  return `KSh ${amount}`;
}
