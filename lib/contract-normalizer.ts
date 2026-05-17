// lib/contract-normalizer.ts
import type { ContractFieldValues } from "./contract-types";

/**
 * Normalize raw AI field values to clean strings.
 * - Coerces all values to string (numbers, booleans, null → string)
 * - Strips trailing dots AI often appends ("1992.." → "1992")
 * - Formats Vietnamese currency amounts ("15000000" → "15.000.000")
 * - Returns empty string for null/undefined
 */
export function normalizeFieldValues(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any>
): ContractFieldValues {
  const result: ContractFieldValues = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (v == null) { result[k] = ""; continue; }
    let str = String(v).trim();
    // Remove trailing dots AI adds (e.g. "1992.." or "Hà Nội.")
    str = str.replace(/\.{2,}$/, "").trim();
    // Format pure numbers that look like VND amounts (>= 1,000 and all digits)
    if (/^\d{4,}$/.test(str)) {
      str = formatViNumber(str);
    }
    result[k] = str;
  }
  return result;
}

/** Format a numeric string with Vietnamese thousand separators: 15000000 → 15.000.000 */
function formatViNumber(numStr: string): string {
  const n = parseInt(numStr, 10);
  if (isNaN(n)) return numStr;
  // Manual formatter — avoids ICU locale availability issues on Vercel
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Case-insensitive lookup: find the value for a token name in fieldValues.
 * Returns empty string if not found.
 */
export function lookupField(
  token: string,
  values: ContractFieldValues
): string {
  // Exact match
  if (token in values) return values[token];
  // Case-insensitive match
  const tokenLower = token.toLowerCase();
  for (const [k, v] of Object.entries(values)) {
    if (k.toLowerCase() === tokenLower) return v;
  }
  // Substring match: field name contains token
  for (const [k, v] of Object.entries(values)) {
    if (k.toLowerCase().includes(tokenLower)) return v;
  }
  return "";
}
