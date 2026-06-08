// Per-request inactivity timer. Resets on progress messages per arinspunk pattern.

export interface InactivityTimer {
  reset(): void;
  clear(): void;
}

export function createInactivityTimer(
  timeoutMs: number,
  onTimeout: () => void,
): InactivityTimer {
  let handle: ReturnType<typeof setTimeout> | null = null;

  function arm(): void {
    if (handle !== null) clearTimeout(handle);
    handle = setTimeout(onTimeout, timeoutMs);
  }

  arm();

  return {
    reset(): void {
      arm();
    },
    clear(): void {
      if (handle !== null) {
        clearTimeout(handle);
        handle = null;
      }
    },
  };
}
