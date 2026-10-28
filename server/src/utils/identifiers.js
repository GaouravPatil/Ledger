import crypto from "node:crypto";

export const generateAccountNumber = () =>
  `AC${crypto.randomInt(100_000_000, 1_000_000_000)}`;

export const generateTransactionReference = () =>
  `TXN-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
