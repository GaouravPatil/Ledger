const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const formatMoney = (value) =>
  currencyFormatter.format(Number(value) || 0);

export const formatCompactMoney = (value) =>
  compactCurrencyFormatter.format(Number(value) || 0);

export const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
};

export const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export const typeLabel = (type) =>
  type ? type.charAt(0).toUpperCase() + type.slice(1) : "Transaction";

export const accountOptionLabel = (account) =>
  `${account.ownerName} · ${account.accountNumber} · ${formatMoney(account.balance)}`;

export const errorMessage = (error) =>
  error?.details?.length ? error.details.join(" ") : error?.message || "Something went wrong.";
