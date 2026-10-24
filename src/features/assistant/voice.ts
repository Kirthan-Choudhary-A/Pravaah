/** Browser audio helpers for the assistant: speak an answer, record a question. */

let current: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

export function stopSpeaking(): void {
  if (current) {
    current.pause();
    current = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export type VoiceChoice = 'female' | 'male';

/** The most natural-sounding voice the browser has for a language, if any. */
export function pickBrowserVoice(language: string, voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const base = language.split('-')[0]!.toLowerCase();
  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.toLowerCase() === language.toLowerCase() ? 4 : 0) +
    (/natural|neural|online|google/i.test(v.name) ? 3 : 0) +
    (v.localService ? 0 : 1);
  return [...matching].sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** Speak with the Sarvam voice; if that is unavailable, use the browser's own voice. */
export async function speak(
  text: string,
  language: string,
  voice: VoiceChoice = 'female',
  fetchImpl: typeof fetch = (...a) => fetch(...a)
): Promise<boolean> {
  stopSpeaking();
  try {
    const res = await fetchImpl('/api/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, language, voice }),
    });
    if (res.ok) {
      const { audio, mime } = (await res.json()) as { audio: string; mime: string };
      currentUrl = URL.createObjectURL(base64ToBlob(audio, mime));
      current = new Audio(currentUrl);
      current.volume = 1;
      await current.play();
      return true;
    }
  } catch {
    // fall through to the browser voice
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = language;
    u.rate = 0.95;
    const better = pickBrowserVoice(language, window.speechSynthesis.getVoices());
    if (better) u.voice = better;
    window.speechSynthesis.speak(u);
    return true;
  }
  return false;
}

export interface Recorder {
  /** Stops recording and resolves with the audio. */
  readonly stop: () => Promise<Blob>;
  /** Stops and throws the audio away. */
  readonly cancel: () => void;
}

export async function startRecording(maxMs = 20_000): Promise<Recorder> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('This browser cannot record audio. Type your question instead.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
    throw new Error('Microphone access was blocked. Allow it in your browser, or type your question.');
  });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const release = () => stream.getTracks().forEach((t) => t.stop());
  const timer = window.setTimeout(() => rec.state === 'recording' && rec.stop(), maxMs);
  rec.start();

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        window.clearTimeout(timer);
        rec.onstop = () => {
          release();
          resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
        };
        if (rec.state === 'recording') rec.stop();
        else rec.onstop?.(new Event('stop'));
      }),
    cancel: () => {
      window.clearTimeout(timer);
      rec.onstop = null;
      if (rec.state === 'recording') rec.stop();
      release();
    },
  };
}

export async function transcribe(
  audio: Blob,
  language: string,
  fetchImpl: typeof fetch = (...a) => fetch(...a)
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const res = await fetchImpl(`/api/stt?lang=${encodeURIComponent(language)}`, {
      method: 'POST',
      headers: { 'content-type': audio.type || 'audio/webm' },
      body: audio,
    });
    const json = (await res.json().catch(() => null)) as { transcript?: string; error?: string } | null;
    if (!res.ok) return { ok: false, error: json?.error ?? 'Could not understand the recording.' };
    const text = (json?.transcript ?? '').trim();
    return text ? { ok: true, text } : { ok: false, error: 'I did not catch that. Please try again.' };
  } catch {
    return { ok: false, error: 'Could not reach the language service.' };
  }
}
