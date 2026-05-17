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
    // Format pure numbers that look like VND amounts (6+ digits = ≥100,000 đồng)
    // Use 6+ to avoid corrupting years (2024), IDs, and other 4-5 digit numbers
    if (/^\d{6,}$/.test(str)) {
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
 * Case-insensitive lookup: find the value for a DOCX token in fieldValues.
 * Priority: exact → case-insensitive → best substring match (smallest length diff).
 * Checks BOTH directions: token contains key OR key contains token.
 */
export function lookupField(
  token: string,
  values: ContractFieldValues
): string {
  // 1. Exact match
  if (token in values) return values[token];

  const tokenLower = token.toLowerCase();

  // 2. Case-insensitive exact match
  for (const [k, v] of Object.entries(values)) {
    if (k.toLowerCase() === tokenLower) return v;
  }

  // 3. Bidirectional substring — pick candidate with smallest length difference
  // (most specific match, avoids short token "TEN" stealing value from "HO_TEN")
  const candidates: { v: string; diff: number }[] = [];
  for (const [k, v] of Object.entries(values)) {
    const kLower = k.toLowerCase();
    if (kLower.includes(tokenLower) || tokenLower.includes(kLower)) {
      candidates.push({ v, diff: Math.abs(k.length - token.length) });
    }
  }
  if (candidates.length > 0) {
    candidates.sort((a, b) => a.diff - b.diff);
    return candidates[0].v;
  }

  return "";
}
