import { KeyPool } from './keyPool.js';

export interface GroqChatPayload {
  readonly messages: readonly unknown[];
  readonly tools?: readonly unknown[];
  readonly tool_choice?: unknown;
  readonly temperature?: number;
  readonly max_tokens?: number;
}

export interface UpstreamDeps {
  readonly fetch: typeof fetch;
  readonly sleep: (ms: number) => Promise<void>;
}

export const defaultDeps: UpstreamDeps = {
  fetch: (...args) => fetch(...args),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

export type GroqResult =
  | { readonly ok: true; readonly data: unknown; readonly model: string }
  | { readonly ok: false; readonly status: number; readonly error: string; readonly retryAfterSeconds?: number };

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_COOLDOWN_MS = 20_000;
const BENCH_MS = 10 * 60_000;
const BUSY = 'The assistant is busy right now. Please try again in a moment.';
const NO_MODEL = 'The assistant has no usable model: none of the configured models is available to its API keys.';
const REJECTED = 'The assistant could not sign in: its API key was rejected. Check the key set on the server.';

function retryAfterMs(res: Response): number {
  const secs = Number(res.headers.get('retry-after'));
  return Number.isFinite(secs) && secs > 0 ? Math.min(secs * 1000, 120_000) : DEFAULT_COOLDOWN_MS;
}

/**
 * Send a chat request, rotating keys and falling back to a second model so a rate limit on one
 * key or one model never reaches the user. If every key is resting it waits briefly (at most
 * `maxWaitMs`, once) for the soonest one, then answers "busy" rather than breaking the flow.
 */
export async function groqChat(
  pool: KeyPool,
  models: readonly string[],
  payload: GroqChatPayload,
  deps: UpstreamDeps = defaultDeps,
  maxWaitMs = 4000
): Promise<GroqResult> {
  if (pool.size === 0) {
    return {
      ok: false,
      status: 503,
      error: 'The assistant is not set up yet: no Groq API key is configured on the server.',
    };
  }

  let sawAuthFailure = false;
  let sawRateLimit = false;
  let missingModels = 0;
  for (let round = 0; round < 2; round++) {
    for (const model of models) {
      for (let attempt = 0; attempt < pool.size; attempt++) {
        const picked = pool.next(model);
        if (!picked) break;
        let res: Response;
        try {
          res = await deps.fetch(GROQ_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${picked.key}` },
            body: JSON.stringify({
              ...payload,
              model,
              // Keep hidden reasoning short so the visible answer is not starved.
              ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
            }),
          });
        } catch {
          continue; // network error: try the next key
        }

        if (res.ok) return { ok: true, data: await res.json(), model };
        if (res.status === 429) {
          sawRateLimit = true;
          pool.cool(picked.index, model, retryAfterMs(res));
          continue;
        }
        if (res.status === 401 || res.status === 403) {
          sawAuthFailure = true;
          pool.bench(picked.index, BENCH_MS);
          continue;
        }
        if (res.status >= 500) continue;
        if (res.status === 404) {
          // This model is gone or not on this account; no other key will have it. Try the next model.
          missingModels++;
          break;
        }
        // Other 4xx are about the request itself; another key will not fix them.
        return { ok: false, status: 400, error: 'The assistant could not read that request.' };
      }
    }

    if (missingModels >= models.length) return { ok: false, status: 503, error: NO_MODEL };

    // Every key was refused as invalid (none merely busy): say so instead of "busy".
    if (sawAuthFailure && !sawRateLimit && pool.next(models[0] ?? '') === null) {
      return { ok: false, status: 503, error: REJECTED };
    }

    const waits = models.map((m) => pool.msUntilReady(m)).filter((v): v is number => v !== null);
    const soonest = waits.length ? Math.min(...waits) : null;
    if (round === 0 && soonest !== null && soonest <= maxWaitMs) {
      await deps.sleep(soonest + 25);
      continue;
    }
    return {
      ok: false,
      status: 503,
      error: BUSY,
      ...(soonest !== null ? { retryAfterSeconds: Math.max(1, Math.ceil(soonest / 1000)) } : {}),
    };
  }
  return { ok: false, status: 503, error: BUSY };
}
