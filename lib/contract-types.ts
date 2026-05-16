// lib/contract-types.ts

/** All field values are guaranteed to be strings (post-normalization). */
export type ContractFieldValues = Record<string, string>;

/** Result from the render pipeline. */
export type RenderResult = {
  html: string;
  /** Template field names that were required but left empty. */
  missingRequired: string[];
};

/** A single template field definition. */
export type ContractField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
};
