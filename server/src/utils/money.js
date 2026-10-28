import { ApiError } from "./ApiError.js";

const MAX_CENTS = 10_000_000_000;

export const moneyToCents = (
  value,
  { field = "Amount", allowZero = false } = {},
) => {
  const raw =
    typeof value === "number" ? String(value) : String(value ?? "").trim();

  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new ApiError(
      400,
      `${field} must be a number with at most two decimal places.`,
    );
  }

  const [whole, fraction = ""] = raw.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) {
    throw new ApiError(
      400,
      `${field} must be no greater than ${MAX_CENTS / 100}.`,
    );
  }

  if (!allowZero && cents === 0) {
    throw new ApiError(400, `${field} must be greater than zero.`);
  }

  return cents;
};

export const centsToMoney = (cents) => Math.round(cents) / 100;
