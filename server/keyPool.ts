/**
 * Round-robin pool of API keys with per-(key, scope) cooldowns.
 *
 * Groq limits apply per organisation and per model, so a 429 only rests that key for that
 * model; the same key stays usable for another model. A key answered with 401/403 is benched.
 */
export interface PickedKey {
  readonly key: string;
  readonly index: number;
}

export class KeyPool {
  private readonly keys: readonly string[];
  private readonly coolUntil = new Map<string, number>();
  private readonly deadUntil = new Map<number, number>();
  private cursor = 0;

  constructor(
    keys: readonly string[],
    private readonly now: () => number = Date.now
  ) {
    this.keys = [...new Set(keys.map((k) => k.trim()).filter(Boolean))];
  }

  get size(): number {
    return this.keys.length;
  }

  private ready(index: number, scope: string): boolean {
    const t = this.now();
    return (
      (this.deadUntil.get(index) ?? 0) <= t && (this.coolUntil.get(`${index}:${scope}`) ?? 0) <= t
    );
  }

  /** Next usable key in rotation for this scope (e.g. a model), or null if all are resting. */
  next(scope = ''): PickedKey | null {
    for (let i = 0; i < this.keys.length; i++) {
      const index = (this.cursor + i) % this.keys.length;
      if (this.ready(index, scope)) {
        this.cursor = (index + 1) % this.keys.length;
        return { key: this.keys[index]!, index };
      }
    }
    return null;
  }

  /** Rate limited: rest this key for this scope. */
  cool(index: number, scope: string, ms: number): void {
    this.coolUntil.set(`${index}:${scope}`, this.now() + ms);
  }

  /** Rejected as invalid: rest this key entirely. */
  bench(index: number, ms: number): void {
    this.deadUntil.set(index, this.now() + ms);
  }

  /** Milliseconds until some key is usable for this scope, or null if there are no keys. */
  msUntilReady(scope = ''): number | null {
    if (this.keys.length === 0) return null;
    const t = this.now();
    let soonest = Infinity;
    for (let i = 0; i < this.keys.length; i++) {
      const wake = Math.max(this.deadUntil.get(i) ?? 0, this.coolUntil.get(`${i}:${scope}`) ?? 0);
      soonest = Math.min(soonest, Math.max(0, wake - t));
    }
    return soonest;
  }
}
