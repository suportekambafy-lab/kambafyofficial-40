import { useRef, useCallback } from 'react';

export function useDebounced<T extends any[]>(
  func: (...args: T) => void | Promise<void>,
  delay: number = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedFunc = useCallback(
    (...args: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    },
    [func, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { debouncedFunc, cancel };
}