/**
 * Request handlers shared by the Vercel function (api/[...route].ts) and the Vite dev server.
 * Web-standard Request/Response only, so the same code runs in both.
 */
import { readConfig, type ServerConfig } from './config';
import { KeyPool } from './keyPool';
import { groqChat, defaultDeps, type UpstreamDeps } from './groq';
import { isLanguageCode, speechToText, textToSpeech, translate, LANGUAGES } from './sarvam';

type Env = Readonly<Record<string, string | undefined>>;

interface Pools {
  readonly config: ServerConfig;
  readonly groq: KeyPool;
  readonly sarvam: KeyPool;
}

// ponytail: pools and the limiter live in one server instance's memory. On serverless, each warm
// instance rotates and rests keys on its own; move to a shared store if instances multiply.
let cached: { readonly signature: string; readonly pools: Pools } | null = null;

function poolsFor(env: Env): Pools {
  const config = readConfig(env);
  const signature = JSON.stringify([config.groqKeys, config.sarvamKeys, config.groqModel, config.groqFallbackModel]);
  if (cached?.signature !== signature) {
    cached = {
      signature,
      pools: { config, groq: new KeyPool(config.groqKeys), sarvam: new KeyPool(config.sarvamKeys) },
    };
  }
  return cached.pools;
}

const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 45;

function limited(ip: string, now: number): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return recent.length > MAX_PER_WINDOW;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });

const fail = (status: number, error: string, extra: Record<string, unknown> = {}): Response =>
  json({ error, ...extra }, status, status === 503 && typeof extra.retryAfterSeconds === 'number' ? { 'retry-after': String(extra.retryAfterSeconds) } : {});

const MAX_MESSAGES = 40;
const MAX_CHARS = 30_000;
const MAX_AUDIO_BYTES = 4_000_000;

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const v: unknown = await req.json();
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function handleApi(
  req: Request,
  env: Env,
  deps: UpstreamDeps = defaultDeps,
  now: () => number = Date.now
): Promise<Response> {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  const pools = poolsFor(env);

  if (route === 'health' && req.method === 'GET') {
    return json({
      ok: true,
      assistant: pools.groq.size > 0,
      language: pools.sarvam.size > 0,
      languages: LANGUAGES,
    });
  }
  if (req.method !== 'POST') return fail(405, 'Use POST for this endpoint.');

  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0]!.trim();
  if (limited(ip, now())) return fail(429, 'Too many requests. Please slow down for a minute.', { retryAfterSeconds: 30 });

  if (route === 'chat') {
    const body = await readJson(req);
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return fail(400, 'Send between 1 and 40 messages.');
    }
    if (JSON.stringify(messages).length > MAX_CHARS) return fail(413, 'That conversation is too long. Start a new one.');
    const tools = Array.isArray(body?.tools) ? body.tools.slice(0, 12) : undefined;
    const result = await groqChat(
      pools.groq,
      [pools.config.groqModel, pools.config.groqFallbackModel],
      {
        messages,
        ...(tools ? { tools, tool_choice: 'auto' } : {}),
        temperature: 0.3,
        max_tokens: 700,
      },
      deps
    );
    return result.ok
      ? json({ data: result.data, model: result.model })
      : fail(result.status, result.error, result.retryAfterSeconds ? { retryAfterSeconds: result.retryAfterSeconds } : {});
  }

  if (route === 'translate') {
    const body = await readJson(req);
    const { text, from, to } = body ?? {};
    if (typeof text !== 'string' || !isLanguageCode(from) || !isLanguageCode(to)) {
      return fail(400, 'Send text, from and to language codes.');
    }
    const r = await translate(pools.sarvam, text, from, to, deps);
    return r.ok ? json({ text: r.data }) : fail(r.status, r.error);
  }

  if (route === 'tts') {
    const body = await readJson(req);
    const { text, language } = body ?? {};
    if (typeof text !== 'string' || !text.trim() || !isLanguageCode(language)) {
      return fail(400, 'Send text and a language code.');
    }
    const r = await textToSpeech(pools.sarvam, text, language, deps);
    return r.ok ? json({ audio: r.data, mime: 'audio/wav' }) : fail(r.status, r.error);
  }

  if (route === 'stt') {
    const lang = url.searchParams.get('lang') ?? 'unknown';
    const language = lang === 'unknown' || isLanguageCode(lang) ? lang : null;
    if (!language) return fail(400, 'Unknown language.');
    const mime = req.headers.get('content-type')?.split(';')[0] ?? 'audio/webm';
    const audio = new Uint8Array(await req.arrayBuffer());
    if (audio.byteLength === 0) return fail(400, 'No audio was received.');
    if (audio.byteLength > MAX_AUDIO_BYTES) return fail(413, 'That recording is too long. Keep it under 30 seconds.');
    const r = await speechToText(pools.sarvam, audio, mime, language, deps);
    return r.ok ? json(r.data) : fail(r.status, r.error);
  }

  return fail(404, 'Unknown endpoint.');
}
