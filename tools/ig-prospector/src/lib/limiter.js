/** Concurrency limiter (max N in flight) and exponential backoff. No dependency. */
export function createLimiter(concurrency) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => { active--; next(); });
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function isRateLimitOrTransient(err) {
  const status = err?.status ?? err?.statusCode ?? err?.response?.status;
  if (status === 429 || (status >= 500 && status < 600)) return true;
  const code = err?.code || err?.cause?.code;
  return ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNREFUSED', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET'].includes(code) || err?.name === 'AbortError';
}

/**
 * Retry with exponential backoff on 429 / 5xx / network errors. Honors Retry-After when present.
 * Default: 5 attempts, 1s base, 60s cap.
 */
export async function withBackoff(fn, { retries = 5, baseMs = 1000, maxMs = 60000, label = 'call', shouldRetry = isRateLimitOrTransient } = {}) {
  let attempt = 0;
  for (;;) {
    try { return await fn(); }
    catch (err) {
      attempt++;
      if (attempt > retries || !shouldRetry(err)) throw err;
      const retryAfter = Number(err?.headers?.['retry-after'] ?? err?.response?.headers?.['retry-after']);
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(maxMs, baseMs * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
      console.warn(`[backoff] ${label} attempt ${attempt}/${retries} failed (${err?.status ?? err?.code ?? err?.message}); retrying in ${Math.round(delay / 1000)}s`);
      await sleep(delay);
    }
  }
}
