import { describe, it, expect } from 'vitest';
import { askAssistant } from '../../src/features/assistant/client';
import { runTool, TOOL_DEFINITIONS, type AssistantContext } from '../../src/features/assistant/tools';
import { planScenario } from '@engine';
import { compareOptions } from '@engine';
import { loadScenario, loadMergedRulePack, loadSources } from '@data';

const scenario = loadScenario('A');
const rulePack = loadMergedRulePack('KA');
const decisions = { form35: 'resolve', licenceRoute: 'online' } as const;
const currentPlan = planScenario({ scenario, mergedPack: rulePack, decisions });
const ctx: AssistantContext = {
  scenario,
  rulePack,
  decisions,
  activeEvents: [],
  currentPlan,
  optionsComparison: compareOptions({ scenario, mergedPack: rulePack, decisions }),
  sources: loadSources(),
  isDegraded: false,
};
const nav: string[] = [];
const effects = { navigate: (p: string) => nav.push(p) };

const jsonRes = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('assistant tools read the same plan the app shows', () => {
  it('summary matches the engine', () => {
    const s = runTool('get_plan_summary', {}, ctx, effects) as Record<string, unknown>;
    expect(s.licenceExpiresDay).toBe(21);
    expect(s.everythingDoneByDay).toBe(currentPlan.finish);
    expect(s.licenceWouldLapse).toBe(false);
    expect(String(s.note)).toMatch(/simulated/i);
  });

  it('what_if simulates without changing anything and reports the move', () => {
    const r = runTool('what_if', { change: 'aadhaar_updated_early' }, ctx, effects) as {
      before: { everythingDoneByDay: number };
      after: { everythingDoneByDay: number };
      finishMovedByDays: number;
    };
    expect(r.before.everythingDoneByDay).toBe(31);
    expect(r.after.everythingDoneByDay).toBe(40);
    expect(r.finishMovedByDays).toBe(9);
    expect(ctx.activeEvents).toHaveLength(0);
  });

  it('what_if clamps silly numbers and rejects unknown changes', () => {
    const r = runTool('what_if', { change: 'slot_queue_longer', days: 9999 }, ctx, effects) as { error?: string };
    expect(r.error).toBeUndefined();
    expect((runTool('what_if', { change: 'melt' }, ctx, effects) as { error?: string }).error).toBeTruthy();
  });

  it('explain_step finds a step by words and lists what it depends on', () => {
    const r = runTool('explain_step', { name: 'form 28' }, ctx, effects) as { step: string; comesAfter: unknown[] };
    expect(r.step).toMatch(/Form 28/i);
    expect(r.comesAfter.length).toBeGreaterThan(0);
  });

  it('fees only add Official items and say they are unverified', () => {
    const r = runTool('get_fees', {}, ctx, effects) as { officialTotalInr: number; officialTotalVerified: boolean };
    expect(r.officialTotalInr).toBe(currentPlan.fees.officialTotal);
    expect(r.officialTotalVerified).toBe(false);
  });

  it('open_page only goes to known pages', () => {
    nav.length = 0;
    runTool('open_page', { page: 'plan' }, ctx, effects);
    expect((runTool('open_page', { page: 'https://evil.example' }, ctx, effects) as { error?: string }).error).toBeTruthy();
    expect(nav).toEqual(['/plan']);
  });

  it('unknown tools are refused, and every definition is implemented', () => {
    expect((runTool('rm_rf', {}, ctx, effects) as { error?: string }).error).toBeTruthy();
    for (const t of TOOL_DEFINITIONS) {
      const r = runTool(t.function.name, t.function.name === 'open_page' ? { page: 'plan' } : t.function.name === 'what_if' ? { change: 'trip_longer' } : t.function.name === 'explain_step' ? { name: 'noc' } : {}, ctx, effects) as { error?: string };
      expect(r.error, t.function.name).toBeUndefined();
    }
  });
});

describe('askAssistant', () => {
  it('runs a tool the model asks for, then returns its final answer', async () => {
    const seen: unknown[] = [];
    let n = 0;
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      seen.push(body);
      n++;
      if (n === 1) {
        return jsonRes({
          data: { choices: [{ message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'get_plan_summary', arguments: '{}' } }] } }] },
        });
      }
      return jsonRes({ data: { choices: [{ message: { content: 'Your licence expires on day 21.' } }] } });
    }) as unknown as typeof fetch;

    const r = await askAssistant([], 'When does my licence expire?', ctx, effects, { language: 'en-IN', fetchImpl });
    expect(r.ok).toBe(true);
    expect(r.text).toBe('Your licence expires on day 21.');
    const second = seen[1] as { messages: { role: string; content: string }[] };
    const toolMsg = second.messages.find((m) => m.role === 'tool')!;
    expect(JSON.parse(toolMsg.content).licenceExpiresDay).toBe(21);
    expect(r.updated.map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it('translates in and out for another language, using the language service', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push(url);
      const body = JSON.parse(String(init.body));
      if (url === '/api/translate') return jsonRes({ text: body.to === 'en-IN' ? 'When does my licence expire?' : 'आपका लाइसेंस दिन 21 को समाप्त होता है।' });
      return jsonRes({ data: { choices: [{ message: { content: 'Your licence expires on day 21.' } }] } });
    }) as unknown as typeof fetch;
    const r = await askAssistant([], 'मेरा लाइसेंस कब खत्म होगा?', ctx, effects, { language: 'hi-IN', fetchImpl });
    expect(r.text).toContain('दिन 21');
    expect(calls).toEqual(['/api/translate', '/api/chat', '/api/translate']);
    expect(r.updated[0]!.content).toBe('When does my licence expire?');
  });

  it('shows the server\'s plain error and keeps history when the assistant is busy', async () => {
    const fetchImpl = (async () => jsonRes({ error: 'The assistant is busy right now. Please try again in a moment.', retryAfterSeconds: 5 }, 503)) as unknown as typeof fetch;
    const history = [{ role: 'user', content: 'hi' } as const];
    const r = await askAssistant(history, 'hello', ctx, effects, { language: 'en-IN', fetchImpl });
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/busy/i);
    expect(r.retryAfterSeconds).toBe(5);
    expect(r.updated).toEqual(history);
  });

  it('survives a model that sends broken tool arguments', async () => {
    let n = 0;
    const fetchImpl = (async () => {
      n++;
      if (n === 1) {
        return jsonRes({ data: { choices: [{ message: { content: null, tool_calls: [{ id: 'x', type: 'function', function: { name: 'what_if', arguments: '{not json' } }] } }] } });
      }
      return jsonRes({ data: { choices: [{ message: { content: 'Tell me which change.' } }] } });
    }) as unknown as typeof fetch;
    const r = await askAssistant([], 'what if', ctx, effects, { language: 'en-IN', fetchImpl });
    expect(r.ok).toBe(true);
  });

  it('stops after the allowed tool rounds instead of looping forever', async () => {
    const fetchImpl = (async () =>
      jsonRes({ data: { choices: [{ message: { content: null, tool_calls: [{ id: 'l', type: 'function', function: { name: 'list_steps', arguments: '{}' } }] } }] } })) as unknown as typeof fetch;
    const r = await askAssistant([], 'loop', ctx, effects, { language: 'en-IN', fetchImpl, maxToolRounds: 2 });
    expect(r.ok).toBe(false);
  });

  it('falls back to the original text if translation is down', async () => {
    const fetchImpl = (async (url: string) =>
      url === '/api/translate'
        ? jsonRes({ error: 'busy' }, 503)
        : jsonRes({ data: { choices: [{ message: { content: 'Day 21.' } }] } })) as unknown as typeof fetch;
    const r = await askAssistant([], 'नमस्ते', ctx, effects, { language: 'hi-IN', fetchImpl });
    expect(r.ok).toBe(true);
    expect(r.text).toBe('Day 21.');
  });
});
