/** Server configuration from environment variables. Keys never reach the browser bundle. */
export interface ServerConfig {
  readonly groqKeys: readonly string[];
  readonly sarvamKeys: readonly string[];
  readonly groqModel: string;
  readonly groqFallbackModel: string;
}

type Env = Readonly<Record<string, string | undefined>>;

const split = (v: string | undefined): string[] =>
  (v ?? '')
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Accepts BASE_KEYS="a,b,c", BASE_KEY="a", and BASE_KEY_1 ... BASE_KEY_20. */
export function readKeys(env: Env, base: string): string[] {
  const out = [...split(env[`${base}_KEYS`]), ...split(env[`${base}_KEY`])];
  for (let i = 1; i <= 20; i++) out.push(...split(env[`${base}_KEY_${i}`]));
  return [...new Set(out)];
}

export function readConfig(env: Env): ServerConfig {
  return {
    groqKeys: readKeys(env, 'GROQ_API'),
    sarvamKeys: readKeys(env, 'SARVAM_API'),
    groqModel: env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile',
    groqFallbackModel: env.GROQ_FALLBACK_MODEL?.trim() || 'llama-3.1-8b-instant',
  };
}
