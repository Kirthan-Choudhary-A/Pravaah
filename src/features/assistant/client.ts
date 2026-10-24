import { TOOL_DEFINITIONS, runTool, type AssistantContext, type ToolEffects } from './tools';

export const SYSTEM_PROMPT = `You are Pravaah, a calm assistant that helps a citizen sort out their driving licence and vehicle paperwork in India.

Rules you always follow:
- Every fact about the user's plan, dates, fees and sources must come from a tool. Call a tool before you answer; never guess a date, fee, law or form number.
- All records here are simulated, timings are assumed, and no rule has been checked against official text. Say so briefly whenever you give a date or a fee, and tell the user to confirm with their RTO before paying or travelling.
- If a tool says rules are unknown for a state, say that plainly. Do not fill the gap.
- Day 0 is today. Say "day 21", not a calendar date.
- Answer in short, plain sentences, at most about 90 words, with no jargon and no markdown tables. A short list is fine.
- Never ask for or repeat Aadhaar, licence, engine or chassis numbers. Family members' Aadhaar, licence and challans are never shown.
- If asked something outside licences and vehicles, say you can only help with that.`;

export interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string | null;
  readonly tool_calls?: readonly {
    readonly id: string;
    readonly type: 'function';
    readonly function: { readonly name: string; readonly arguments: string };
  }[];
  readonly tool_call_id?: string;
}

export interface AskResult {
  readonly ok: boolean;
  /** Shown to the user, in their language. */
  readonly text: string;
  readonly retryAfterSeconds?: number;
}

export interface AskOptions {
  readonly fetchImpl?: typeof fetch;
  /** BCP-47 code such as hi-IN. English needs no translation. */
  readonly language: string;
  readonly maxToolRounds?: number;
}

async function post<T>(
  f: typeof fetch,
  path: string,
  body: unknown
): Promise<{ ok: true; data: T } | { ok: false; error: string; retryAfterSeconds?: number }> {
  try {
    const res = await f(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      return {
        ok: false,
        error: typeof json?.error === 'string' ? json.error : 'Something went wrong. Please try again.',
        ...(typeof json?.retryAfterSeconds === 'number' ? { retryAfterSeconds: json.retryAfterSeconds } : {}),
      };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: 'Could not reach the assistant. Check your connection and try again.' };
  }
}

const isEnglish = (code: string) => code === 'en-IN';

async function toLanguage(f: typeof fetch, text: string, from: string, to: string): Promise<string> {
  if (from === to || !text.trim()) return text;
  const r = await post<{ text: string }>(f, '/api/translate', { text, from, to });
  // If translation is unavailable, keep going in the original language rather than failing.
  return r.ok ? r.data.text : text;
}

/**
 * One user turn: translate in if needed, let the model call tools against the live plan,
 * translate the answer back. `history` holds English conversation turns only (no system prompt).
 */
export async function askAssistant(
  history: readonly ChatMessage[],
  userText: string,
  ctx: AssistantContext,
  effects: ToolEffects,
  opts: AskOptions
): Promise<AskResult & { readonly updated: readonly ChatMessage[] }> {
  const f = opts.fetchImpl ?? ((...a) => fetch(...a));
  const english = isEnglish(opts.language) ? userText : await toLanguage(f, userText, opts.language, 'en-IN');

  const convo: ChatMessage[] = [...history, { role: 'user', content: english }];
  const maxRounds = opts.maxToolRounds ?? 5;

  for (let round = 0; round <= maxRounds; round++) {
    const reply = await post<{
      data: { choices?: { message?: { content?: string | null; tool_calls?: ChatMessage['tool_calls'] } }[] };
    }>(f, '/api/chat', {
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...convo],
      // On the last round, withhold tools so the model must answer.
      ...(round < maxRounds ? { tools: TOOL_DEFINITIONS } : {}),
    });
    if (!reply.ok) {
      return {
        ok: false,
        text: await toLanguage(f, reply.error, 'en-IN', opts.language),
        ...(reply.retryAfterSeconds ? { retryAfterSeconds: reply.retryAfterSeconds } : {}),
        updated: history,
      };
    }

    const message = reply.data.data.choices?.[0]?.message;
    if (!message) {
      return { ok: false, text: 'The assistant sent an empty answer. Please try again.', updated: history };
    }

    if (message.tool_calls?.length) {
      convo.push({ role: 'assistant', content: message.content ?? null, tool_calls: message.tool_calls });
      for (const call of message.tool_calls) {
        let parsed: unknown = {};
        try {
          parsed = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          parsed = {};
        }
        let result: unknown;
        try {
          result = runTool(call.function.name, parsed, ctx, effects);
        } catch {
          result = { error: 'That tool failed.' };
        }
        convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
      continue;
    }

    const answer = (message.content ?? '').trim();
    convo.push({ role: 'assistant', content: answer });
    // Keep only the readable turns in history; tool traffic is rebuilt each question.
    const kept = [...history, { role: 'user', content: english } as ChatMessage, { role: 'assistant', content: answer } as ChatMessage];
    return {
      ok: true,
      text: isEnglish(opts.language) ? answer : await toLanguage(f, answer, 'en-IN', opts.language),
      updated: kept.slice(-12),
    };
  }

  return { ok: false, text: 'I could not finish that. Please ask in a simpler way.', updated: history };
}
