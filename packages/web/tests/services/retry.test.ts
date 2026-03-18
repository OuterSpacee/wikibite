import { describe, it, expect, vi } from 'vitest';
import { withRetry, CircuitBreaker } from '@/services/retry';

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 }))
      .rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(withRetry(fn, { maxAttempts: 3, signal: controller.signal }))
      .rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(0);
  });
});

describe('CircuitBreaker', () => {
  it('opens after threshold failures', () => {
    const cb = new CircuitBreaker({ threshold: 3, resetTimeMs: 100 });
    expect(cb.isOpen()).toBe(false);
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
  });

  it('resets after timeout', async () => {
    const cb = new CircuitBreaker({ threshold: 2, resetTimeMs: 50 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
    await new Promise(r => setTimeout(r, 60));
    expect(cb.isOpen()).toBe(false);
  });

  it('resets on success', () => {
    const cb = new CircuitBreaker({ threshold: 3, resetTimeMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.isOpen()).toBe(false);
  });
});
