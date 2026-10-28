export const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const cleanDescription = (value) =>
  typeof value === "string" ? value.trim().slice(0, 180) : "";
