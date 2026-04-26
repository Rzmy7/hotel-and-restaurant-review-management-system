/**
 * Sri Lankan Phone Validation Utilities
 * Handles E.164 normalization and validation for Sri Lankan mobile numbers.
 */

const SRI_LANKA_COUNTRY_CODE = "+94";

/**
 * Mobile prefixes permitted in Sri Lanka (70, 71, 72, 74, 75, 76, 77, 78).
 * Used a Set for O(1) lookup performance.
 */
const SRI_LANKA_PREFIXES = new Set([
  "70",
  "71",
  "72",
  "74",
  "75",
  "76",
  "77",
  "78",
]);

export const PHONE_DIGITS_ONLY_ERROR = "Phone number must contain only digits";
export const PHONE_LENGTH_ERROR = "Phone number must be exactly 9 digits";
export const PHONE_PREFIX_ERROR = "Invalid Sri Lankan mobile number prefix";

/**
 * Extracts the local part of a Sri Lankan number by stripping the country code.
 * @param value Raw phone number string.
 * @returns 9-digit local number string.
 */
export const extractSriLankanLocalNumber = (value: string | null): string => {
  const normalized = (value || "").trim();

  if (!normalized) {
    return "";
  }

  const noSpaces = normalized.replace(/\s+/g, "");

  if (noSpaces.startsWith("+94")) {
    return noSpaces.slice(3);
  }

  if (noSpaces.startsWith("94")) {
    return noSpaces.slice(2);
  }

  return noSpaces;
};

/**
 * Validates a local Sri Lankan phone number.
 * @param localPhone 9-digit local number.
 * @returns Error message string or null if valid.
 */
export const validateSriLankanLocalPhone = (
  localPhone: string | null,
): string | null => {
  const normalized = (localPhone || "").trim();

  if (!normalized) {
    return null;
  }

  if (!/^\d+$/.test(normalized)) {
    return PHONE_DIGITS_ONLY_ERROR;
  }

  if (normalized.length !== 9) {
    return PHONE_LENGTH_ERROR;
  }

  if (!SRI_LANKA_PREFIXES.has(normalized.slice(0, 2))) {
    return PHONE_PREFIX_ERROR;
  }

  return null;
};

/**
 * Converts a local number to international E.164 format.
 * @param localPhone Local number string.
 */
export const toSriLankanE164 = (localPhone: string | null): string => {
  const digits = (localPhone || "").replace(/\D/g, "");
  return digits ? `${SRI_LANKA_COUNTRY_CODE}${digits}` : "";
};

/**
 * Formats a local number for visual display in the UI.
 * Example: +94 77 123 4567
 * @param localPhone Local number string.
 */
export const formatSriLankanFullNumberPreview = (
  localPhone: string | null,
): string => {
  const digits = (localPhone || "").replace(/\D/g, "").slice(0, 9);

  if (!digits) {
    return SRI_LANKA_COUNTRY_CODE;
  }

  const first = digits.slice(0, 2);
  const second = digits.slice(2, 5);
  const third = digits.slice(5, 9);

  return [SRI_LANKA_COUNTRY_CODE, first, second, third]
    .filter(Boolean)
    .join(" ");
};
