export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, baseDelayMs = 1000, signal } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      });
    }
  }

  throw new Error('Unreachable');
}

export interface CircuitBreakerOptions {
  threshold: number;
  resetTimeMs: number;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly resetTimeMs: number;

  constructor(options: CircuitBreakerOptions) {
    this.threshold = options.threshold;
    this.resetTimeMs = options.resetTimeMs;
  }

  isOpen(): boolean {
    if (this.failures < this.threshold) return false;
    if (Date.now() - this.lastFailureTime > this.resetTimeMs) {
      this.failures = 0;
      return false;
    }
    return true;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  recordSuccess(): void {
    this.failures = 0;
  }
}
