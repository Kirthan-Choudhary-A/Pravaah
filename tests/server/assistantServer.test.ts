import { describe, it, expect } from 'vitest';
import { KeyPool } from '../../server/keyPool';
import { groqChat, type UpstreamDeps } from '../../server/groq';
import { readKeys } from '../../server/config';
import { handleApi } from '../../server/handlers';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const status = (code: number, headers: Record<string, string> = {}) => new Response('{}', { status: code, headers });

/** Fake upstream: answers by the bearer key and records every call. */
function fakeDeps(answer: (key: string, model: string, n: number) => Response) {
  const calls: { key: string; model: string }[] = [];
  const slept: number[] = [];
  const deps: UpstreamDeps = {
    fetch: (async (_url: unknown, init?: RequestInit) => {
      const key = String((init?.headers as Record<string, string>).authorization).replace('Bearer ', '');
      const model = JSON.parse(String(init?.body)).model as string;
      calls.push({ key, model });
      return answer(key, model, calls.length);
    }) as typeof fetch,
    sleep: async (ms) => {
      slept.push(ms);
    },
  };
  return { deps, calls, slept };
}

const payload = { messages: [{ role: 'user', content: 'hi' }] };

describe('KeyPool', () => {
  it('rotates round robin across keys', () => {
    const pool = new KeyPool(['a', 'b', 'c']);
    expect([1, 2, 3, 4, 5, 6].map(() => pool.next('m')!.key)).toEqual(['a', 'b', 'c', 'a', 'b', 'c']);
  });

  it('rests a key only for the model that was limited', () => {
    const pool = new KeyPool(['a', 'b']);
    pool.cool(0, 'big', 10_000);
    expect([1, 2, 3].map(() => pool.next('big')!.key)).toEqual(['b', 'b', 'b']);
    expect(pool.next('small')!.key).toBeDefined();
    const keys = new Set([pool.next('small')!.key, pool.next('small')!.key]);
    expect(keys.has('a')).toBe(true);
  });

  it('brings a key back once its cooldown passes', () => {
    let t = 0;
    const pool = new KeyPool(['a'], () => t);
    pool.cool(0, 'm', 5000);
    expect(pool.next('m')).toBeNull();
    expect(pool.msUntilReady('m')).toBe(5000);
    t = 5001;
    expect(pool.next('m')!.key).toBe('a');
  });

  it('ignores blanks and duplicates', () => {
    expect(new KeyPool([' a ', '', 'a', 'b']).size).toBe(2);
  });
});

describe('Groq failover keeps the flow going', () => {
  it('moves to the next key on a rate limit without the caller noticing', async () => {
    const { deps, calls } = fakeDeps((key) => (key === 'k1' ? status(429, { 'retry-after': '30' }) : ok({ choices: [{ message: { content: 'hello' } }] })));
    const pool = new KeyPool(['k1', 'k2']);
    const r = await groqChat(pool, ['big', 'small'], payload, deps);
    expect(r.ok).toBe(true);
    expect(calls.map((c) => c.key)).toEqual(['k1', 'k2']);

    // The limited key is now resting, so the next question goes straight to k2.
    await groqChat(pool, ['big', 'small'], payload, deps);
    expect(calls.slice(2).map((c) => c.key)).toEqual(['k2']);
  });

  it('falls back to the second model when every key is limited on the first', async () => {
    const { deps, calls } = fakeDeps((_k, model) => (model === 'big' ? status(429) : ok({ ok: 1 })));
    const r = await groqChat(new KeyPool(['k1', 'k2']), ['big', 'small'], payload, deps);
    expect(r.ok && r.model).toBe('small');
    expect(calls.filter((c) => c.model === 'big')).toHaveLength(2);
  });

  it('benches a key that is rejected as invalid', async () => {
    const { deps } = fakeDeps((key) => (key === 'bad' ? status(401) : ok({ ok: 1 })));
    const pool = new KeyPool(['bad', 'good']);
    expect((await groqChat(pool, ['m'], payload, deps)).ok).toBe(true);
    expect(pool.next('m')!.key).toBe('good');
    expect(pool.next('m')!.key).toBe('good');
  });

  it('waits briefly for a resting key instead of failing', async () => {
    let n = 0;
    const { deps, slept } = fakeDeps(() => (++n === 1 ? status(429, { 'retry-after': '1' }) : ok({ ok: 1 })));
    let t = 0;
    const pool = new KeyPool(['only'], () => t);
    const advancing: UpstreamDeps = {
      fetch: deps.fetch,
      sleep: async (ms: number) => {
        slept.push(ms);
        t += ms;
      },
    };
    const r = await groqChat(pool, ['m'], payload, advancing);
    expect(r.ok).toBe(true);
    expect(slept.length).toBe(1);
  });

  it('says busy, with a retry hint, when the wait would be too long', async () => {
    const { deps } = fakeDeps(() => status(429, { 'retry-after': '60' }));
    const r = await groqChat(new KeyPool(['k1']), ['m'], payload, deps);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(503);
      expect(r.retryAfterSeconds).toBeGreaterThan(0);
      expect(r.error).toMatch(/busy/i);
    }
  });

  it('tells the operator when every key is rejected, instead of saying busy', async () => {
    const { deps } = fakeDeps(() => status(401));
    const r = await groqChat(new KeyPool(['bad1', 'bad2']), ['m'], payload, deps);
    expect(!r.ok && r.error).toMatch(/key was rejected/i);
  });

  it('rotates over network errors and 5xx', async () => {
    let n = 0;
    const { deps } = fakeDeps(() => (++n === 1 ? status(502) : ok({ ok: 1 })));
    expect((await groqChat(new KeyPool(['k1', 'k2']), ['m'], payload, deps)).ok).toBe(true);
  });

  it('does not burn every key on a bad request', async () => {
    const { deps, calls } = fakeDeps(() => status(400));
    const r = await groqChat(new KeyPool(['k1', 'k2', 'k3']), ['m'], payload, deps);
    expect(r.ok).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('explains plainly when no key is configured', async () => {
    const r = await groqChat(new KeyPool([]), ['m'], payload);
    expect(!r.ok && r.error).toMatch(/not set up/i);
  });
});

describe('Sarvam', () => {
  it('rotates past a rate-limited key and reports rejected keys honestly', async () => {
    const { translate } = await import('../../server/sarvam');
    const good = fakeDeps((key) => (key === 's1' ? status(429) : ok({ translated_text: 'नमस्ते' })));
    const r = await translate(new KeyPool(['s1', 's2']), 'hello', 'en-IN', 'hi-IN', good.deps);
    expect(r.ok && r.data).toBe('नमस्ते');
    const bad = fakeDeps(() => status(403));
    const r2 = await translate(new KeyPool(['x']), 'hello', 'en-IN', 'hi-IN', bad.deps);
    expect(!r2.ok && r2.error).toMatch(/key was rejected/i);
  });
});

describe('Config', () => {
  it('reads comma lists, single keys and numbered keys without duplicates', () => {
    expect(readKeys({ GROQ_API_KEYS: 'a, b\nc', GROQ_API_KEY: 'a', GROQ_API_KEY_2: 'd' }, 'GROQ_API')).toEqual(['a', 'b', 'c', 'd']);
    expect(readKeys({}, 'GROQ_API')).toEqual([]);
  });
});

describe('API handlers', () => {
  const env = { GROQ_API_KEYS: 'k1,k2', SARVAM_API_KEYS: 's1' };
  const post = (path: string, body: unknown, ip = '9.9.9.9') =>
    new Request(`http://x/api/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    });

  it('reports what is configured without revealing keys', async () => {
    const res = await handleApi(new Request('http://x/api/health'), env);
    const body = await res.json();
    expect(body.assistant).toBe(true);
    expect(body.language).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/k1|s1/);
  });

  it('reports an unconfigured server honestly', async () => {
    const body = await (await handleApi(new Request('http://x/api/health'), {})).json();
    expect(body.assistant).toBe(false);
  });

  it('chat: validates input and proxies the answer', async () => {
    const { deps } = fakeDeps(() => ok({ choices: [{ message: { content: 'hi' } }] }));
    expect((await handleApi(post('chat', { messages: [] }, '1.1.1.1'), env, deps)).status).toBe(400);
    const res = await handleApi(post('chat', payload, '1.1.1.2'), env, deps);
    expect(res.status).toBe(200);
    expect((await res.json()).data.choices[0].message.content).toBe('hi');
  });

  it('chat: rejects an oversized conversation', async () => {
    const big = { messages: [{ role: 'user', content: 'x'.repeat(40_000) }] };
    expect((await handleApi(post('chat', big, '1.1.1.3'), env)).status).toBe(413);
  });

  it('translate and tts validate language codes', async () => {
    expect((await handleApi(post('translate', { text: 'hi', from: 'xx', to: 'hi-IN' }, '2.2.2.1'), env)).status).toBe(400);
    expect((await handleApi(post('tts', { text: 'hi', language: 'zz' }, '2.2.2.2'), env)).status).toBe(400);
  });

  it('translate: same language needs no upstream call', async () => {
    const { deps, calls } = fakeDeps(() => status(500));
    const res = await handleApi(post('translate', { text: 'hello', from: 'en-IN', to: 'en-IN' }, '2.2.2.3'), env, deps);
    expect((await res.json()).text).toBe('hello');
    expect(calls).toHaveLength(0);
  });

  it('tts: chooses the voice by gender and ignores anything else', async () => {
    const bodies: Record<string, unknown>[] = [];
    const { deps } = fakeDeps(() => ok({ audios: ['QUJD'] }));
    const spy: UpstreamDeps = {
      fetch: (async (u: unknown, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)));
        return deps.fetch(u as string, init);
      }) as typeof fetch,
      sleep: deps.sleep,
    };
    await handleApi(post('tts', { text: 'hi', language: 'en-IN', voice: 'male' }, '6.6.6.1'), env, spy);
    await handleApi(post('tts', { text: 'hi', language: 'en-IN', voice: 'shubh; drop table' }, '6.6.6.2'), env, spy);
    expect(bodies[0]!.speaker).toBe('shubh');
    expect(bodies[1]!.speaker).toBe('ritu');
  });

  it('refuses GET on action endpoints and unknown routes', async () => {
    expect((await handleApi(new Request('http://x/api/chat'), env)).status).toBe(405);
    expect((await handleApi(post('nope', {}, '3.3.3.3'), env)).status).toBe(404);
  });

  it('limits one address that floods the endpoint', async () => {
    const { deps } = fakeDeps(() => ok({ ok: 1 }));
    let last = 200;
    for (let i = 0; i < 60; i++) last = (await handleApi(post('chat', payload, '4.4.4.4'), env, deps)).status;
    expect(last).toBe(429);
    expect((await handleApi(post('chat', payload, '5.5.5.5'), env, deps)).status).toBe(200);
  });
});
