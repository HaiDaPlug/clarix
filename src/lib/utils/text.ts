export function withPeriod(text: string): string {
  const trimmed = text.trimEnd();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

// Numeric token patterns — exported so highlight-numbers.tsx can use the same regexes.
// The leading sign class covers ASCII +/- AND the Unicode minus − (U+2212),
// which language models routinely emit for negative deltas. Without it, "−9 %"
// would be captured but fail NEG_TEST and render neutral instead of red.
export const NUM_SPLIT = /([+\-−]?\d\d*(?:\s\d+)*(?:[,.]\d+)?(?:\s*[%x])?)/g;
export const NUM_TEST  = /^[+\-−]?\d\d*(?:\s\d+)*(?:[,.]\d+)?(?:\s*[%x])?$/;
export const POS_TEST  = /^\+/;
export const NEG_TEST  = /^[-−]/;
