/** Server configuration from environment variables. Keys never reach the browser bundle. */
export interface ServerConfig {
  readonly groqKeys: readonly string[];
  readonly sarvamKeys: readonly string[];
  /** Chat models in order of preference; later ones are fallbacks. */
  readonly groqModels: readonly string[];
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

// Groq retires models over time; these are the ones chat-capable keys offered when this was written.
const DEFAULT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

export function readConfig(env: Env): ServerConfig {
  const listed = split(env.GROQ_MODELS);
  return {
    groqKeys: readKeys(env, 'GROQ_API'),
    sarvamKeys: readKeys(env, 'SARVAM_API'),
    groqModels: listed.length ? listed : DEFAULT_MODELS,
  };
}
