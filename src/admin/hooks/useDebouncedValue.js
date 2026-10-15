import { useEffect, useState } from "react";

// Returns a copy of `value` that only updates once the caller has stopped
// changing it for `delay` milliseconds. Used to debounce admin search inputs so
// we issue one request per pause instead of one per keystroke.
export default function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}
