import { KeyPool } from './keyPool';
import { defaultDeps, type UpstreamDeps } from './groq';

const BASE = 'https://api.sarvam.ai';

/** Languages Pravaah offers; all are covered by Sarvam translation and text-to-speech. */
export const LANGUAGES = {
  'en-IN': 'English',
  'hi-IN': 'हिन्दी',
  'te-IN': 'తెలుగు',
  'kn-IN': 'ಕನ್ನಡ',
  'ta-IN': 'தமிழ்',
  'mr-IN': 'मराठी',
  'bn-IN': 'বাংলা',
} as const;

export type LanguageCode = keyof typeof LANGUAGES;
export const isLanguageCode = (v: unknown): v is LanguageCode =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(LANGUAGES, v);

export type SarvamResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly status: number; readonly error: string };

async function call<T>(
  pool: KeyPool,
  deps: UpstreamDeps,
  path: string,
  init: (key: string) => RequestInit,
  parse: (json: unknown) => T | null
): Promise<SarvamResult<T>> {
  if (pool.size === 0) {
    return {
      ok: false,
      status: 503,
      error: 'Language services are not set up yet: no Sarvam API key is configured on the server.',
    };
  }
  let sawAuthFailure = false;
  let sawRateLimit = false;
  for (let attempt = 0; attempt < pool.size * 2; attempt++) {
    const picked = pool.next('sarvam');
    if (!picked) break;
    let res: Response;
    try {
      res = await deps.fetch(`${BASE}${path}`, init(picked.key));
    } catch {
      continue;
    }
    if (res.ok) {
      const parsed = parse(await res.json().catch(() => null));
      return parsed !== null
        ? { ok: true, data: parsed }
        : { ok: false, status: 502, error: 'The language service returned an unexpected answer.' };
    }
    if (res.status === 429) {
      sawRateLimit = true;
      const secs = Number(res.headers.get('retry-after'));
      pool.cool(picked.index, 'sarvam', Number.isFinite(secs) && secs > 0 ? secs * 1000 : 15_000);
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      sawAuthFailure = true;
      pool.bench(picked.index, 10 * 60_000);
      continue;
    }
    if (res.status >= 500) continue;
    return { ok: false, status: 400, error: 'The language service could not process that request.' };
  }
  if (sawAuthFailure && !sawRateLimit) {
    return { ok: false, status: 503, error: 'The language service could not sign in: its API key was rejected. Check the key set on the server.' };
  }
  return { ok: false, status: 503, error: 'The language service is busy. Please try again in a moment.' };
}

export function translate(
  pool: KeyPool,
  text: string,
  from: LanguageCode,
  to: LanguageCode,
  deps: UpstreamDeps = defaultDeps
): Promise<SarvamResult<string>> {
  if (from === to || !text.trim()) return Promise.resolve({ ok: true, data: text });
  return call(
    pool,
    deps,
    '/translate',
    (key) => ({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'api-subscription-key': key },
      body: JSON.stringify({
        input: text.slice(0, 1900),
        source_language_code: from,
        target_language_code: to,
        model: 'sarvam-translate:v1',
        mode: 'formal',
      }),
    }),
    (j) => {
      const t = (j as { translated_text?: unknown } | null)?.translated_text;
      return typeof t === 'string' ? t : null;
    }
  );
}

/** Sarvam bulbul:v3 speakers; the browser asks for a gender, never a raw speaker name. */
export const VOICES = { female: 'ritu', male: 'shubh' } as const;
export type VoiceChoice = keyof typeof VOICES;
export const isVoiceChoice = (v: unknown): v is VoiceChoice => v === 'female' || v === 'male';

/** Returns one base64 WAV string. */
export function textToSpeech(
  pool: KeyPool,
  text: string,
  language: LanguageCode,
  voice: VoiceChoice = 'female',
  deps: UpstreamDeps = defaultDeps
): Promise<SarvamResult<string>> {
  return call(
    pool,
    deps,
    '/text-to-speech',
    (key) => ({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'api-subscription-key': key },
      body: JSON.stringify({
        text: text.slice(0, 2400),
        language_code: language,
        model: 'bulbul:v3',
        speaker: VOICES[voice],
        pace: 0.95,
        speech_sample_rate: 32000,
      }),
    }),
    (j) => {
      const a = (j as { audios?: unknown } | null)?.audios;
      return Array.isArray(a) && typeof a[0] === 'string' ? a[0] : null;
    }
  );
}

export function speechToText(
  pool: KeyPool,
  audio: Uint8Array,
  mimeType: string,
  language: LanguageCode | 'unknown',
  deps: UpstreamDeps = defaultDeps
): Promise<SarvamResult<{ transcript: string; language: string | null }>> {
  return call(
    pool,
    deps,
    '/speech-to-text',
    (key) => {
      const form = new FormData();
      const ext = mimeType.includes('ogg')
        ? 'ogg'
        : mimeType.includes('mp4')
          ? 'm4a'
          : mimeType.includes('wav')
            ? 'wav'
            : 'webm';
      form.append('file', new Blob([audio as BlobPart], { type: mimeType }), `speech.${ext}`);
      form.append('model', 'saaras:v3');
      form.append('mode', 'transcribe');
      form.append('language_code', language);
      return { method: 'POST', headers: { 'api-subscription-key': key }, body: form };
    },
    (j) => {
      const o = j as { transcript?: unknown; language_code?: unknown } | null;
      return typeof o?.transcript === 'string'
        ? { transcript: o.transcript, language: typeof o.language_code === 'string' ? o.language_code : null }
        : null;
    }
  );
}
