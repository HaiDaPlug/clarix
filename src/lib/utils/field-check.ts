/**
 * Resolve a dot-notation path into a nested object.
 * Returns undefined if any segment is missing.
 */
export function getNestedField(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc === null || acc === undefined || typeof acc !== "object") {
      return undefined;
    }
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/**
 * Check whether a set of dot-notation field paths all resolve
 * to non-null, non-undefined values in the given object.
 */
export function checkFields(
  obj: unknown,
  fields: string[]
): { present: string[]; missing: string[] } {
  const present: string[] = [];
  const missing: string[] = [];

  for (const field of fields) {
    const value = getNestedField(obj, field);
    if (value !== undefined && value !== null) {
      present.push(field);
    } else {
      missing.push(field);
    }
  }

  return { present, missing };
}
