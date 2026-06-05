export function withPeriod(text: string): string {
  const trimmed = text.trimEnd();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

// Numeric token patterns — exported so highlight-numbers.tsx can use the same regexes.
export const NUM_SPLIT = /([+-]?\d[\d\s]*(?:[,.]\d+)?(?:\s*[%x])?)/g;
export const NUM_TEST  = /^[+-]?\d[\d\s]*(?:[,.]\d+)?(?:\s*[%x])?$/;
export const POS_TEST  = /^\+/;
export const NEG_TEST  = /^-/;
