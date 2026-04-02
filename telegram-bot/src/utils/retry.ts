/**
 * Retries `fn` up to `maxAttempts` times with exponential backoff.
 * Waits 1s, 2s, 4s between attempts.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

/**
 * Rejects if `fn` doesn't resolve within `ms` milliseconds.
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  ms = 10_000
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
}
