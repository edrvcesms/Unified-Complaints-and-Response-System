export const maskFullName = (value?: string | null): string => {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

  if (!normalized) return "N/A";
  if (normalized.length === 1) return normalized;
  if (normalized.length === 2) return `${normalized[0]}*`;

  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  const middle = "*".repeat(Math.max(0, normalized.length - 2));

  return `${first}${middle}${last}`;
};

export const maskEmail = (value?: string | null): string => {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) return "N/A";

  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return maskFullName(normalized);
  }

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex);

  if (localPart.length <= 2) {
    return normalized;
  }

  const first = localPart[0];
  const last = localPart[localPart.length - 1];
  const middle = "*".repeat(Math.max(0, localPart.length - 2));

  return `${first}${middle}${last}${domain}`;
};

export const maskPhoneNumber = (value?: string | null): string => {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) return "N/A";

  const digits = normalized.replace(/\D/g, "");
  if (!digits) return "N/A";

  if (digits.length <= 2) {
    return "*".repeat(digits.length);
  }

  return `${"*".repeat(Math.max(0, digits.length - 2))}${digits.slice(-2)}`;
};
