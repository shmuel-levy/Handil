import { useEffect, useState } from 'react';

/**
 * Returns `value` only after it has stopped changing for `delayMs`.
 *
 * The worker search used to refetch on every keystroke, so typing
 * "אינסטלטור" fired ten requests and the results flickered as the slower
 * ones landed out of order.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
