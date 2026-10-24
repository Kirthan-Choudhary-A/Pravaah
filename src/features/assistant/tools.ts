/**
 * The assistant's tools. They run in the browser against the same engine and data the app
 * shows, so every number the assistant quotes is the number on screen. The model is never
 * given facts to remember; it asks these functions.
 */
import { applyEvent, diffPlans, planScenario } from '@engine';
import type {
  Decisions,
  OptionComparison,
  PlanInput,
  PlanResult,
  PlanningEvent,
  RulePack,
  Scenario,
  SourceEntry,
} from '@engine/model/types';

export interface AssistantContext {
  readonly scenario: Scenario;
  readonly rulePack: RulePack;
  readonly decisions: Decisions;
  readonly activeEvents: readonly PlanningEvent[];
  readonly currentPlan: PlanResult;
  readonly optionsComparison: readonly OptionComparison[];
  readonly sources: readonly SourceEntry[];
  readonly isDegraded: boolean;
}

export interface ToolDefinition {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
}

const noArgs = { type: 'object', properties: {}, additionalProperties: false };

export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_plan_summary',
      description:
        'Overview of the citizen\'s current plan: licence expiry day, when renewal finishes and its status, when everything is done, what is holding things up, and whether rules are unknown for the destination state.',
      parameters: noArgs,
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_steps',
      description:
        'Every step in the plan in time order with start day, end day, latest safe start day, status and the reason it exists.',
      parameters: noArgs,
    },
  },
  {
    type: 'function',
    function: {
      name: 'explain_step',
      description: 'Why one step exists and what it depends on or unlocks. Match by words from the step name.',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Part of the step name, e.g. "NOC" or "Aadhaar".' } },
        required: ['name'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_fees',
      description:
        'Fee breakdown. Only items tagged Official are added into the official total; Estimate items vary. All are unverified.',
      parameters: noArgs,
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_routes',
      description: 'The best three ways to renew the licence and handle Form 35, ranked, with finish days.',
      parameters: noArgs,
    },
  },
  {
    type: 'function',
    function: {
      name: 'what_if',
      description:
        'Simulate one change without altering the app and report how the plan moves. change is one of: slot_queue_longer, trip_longer, form35_rejected, aadhaar_updated_early.',
      parameters: {
        type: 'object',
        properties: {
          change: {
            type: 'string',
            enum: ['slot_queue_longer', 'trip_longer', 'form35_rejected', 'aadhaar_updated_early'],
          },
          days: {
            type: 'number',
            description: 'For slot_queue_longer the new queue length in days; for trip_longer the extra days away.',
          },
        },
        required: ['change'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sources',
      description: 'The official sources the rules come from, and whether each has been verified.',
      parameters: noArgs,
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_page',
      description: 'Take the user to a page of the app. page is one of: dashboard, plan, what-if, family, plate, sources.',
      parameters: {
        type: 'object',
        properties: { page: { type: 'string', enum: ['dashboard', 'plan', 'what-if', 'family', 'plate', 'sources'] } },
        required: ['page'],
        additionalProperties: false,
      },
    },
  },
];

const PAGE_PATHS: Record<string, string> = {
  dashboard: '/',
  plan: '/plan',
  'what-if': '/simulate',
  family: '/household',
  plate: '/voice',
  sources: '/sources',
};

export interface ToolEffects {
  readonly navigate: (path: string) => void;
}

const brief = (p: PlanResult) => {
  const renewal = p.tasks.find((t) => t.id === 'task-licence-renewal');
  return {
    everythingDoneByDay: p.finish,
    licenceRenewalEndsDay: renewal?.end ?? null,
    licenceRenewalStatus: renewal?.status ?? null,
    lateSteps: p.tasks.filter((t) => t.status === 'Missed').map((t) => t.name),
  };
};

export function runTool(name: string, rawArgs: unknown, ctx: AssistantContext, effects: ToolEffects): unknown {
  const args = (rawArgs && typeof rawArgs === 'object' ? rawArgs : {}) as Record<string, unknown>;
  const { scenario, currentPlan } = ctx;

  switch (name) {
    case 'get_plan_summary': {
      const b = brief(currentPlan);
      return {
        note: 'All data is simulated. Timings are assumed. No rule has been verified against official text.',
        move: `${scenario.move.fromRTO} to ${scenario.move.toRTO}`,
        vehicle: scenario.move.vehicleType + (scenario.move.isBHSeries ? ' (BH series)' : ''),
        licenceExpiresDay: scenario.licenceExpiryDay,
        ...b,
        licenceWouldLapse: b.licenceRenewalEndsDay !== null && b.licenceRenewalEndsDay > scenario.licenceExpiryDay,
        firstAppointmentDay: scenario.primarySlotQueue,
        ownerAwayDays: `${scenario.absence.start} to ${scenario.absence.end - 1}`,
        holdingThingsUp: [
          scenario.blockers.form35Open && !scenario.move.isBHSeries ? 'an open Form 35 (loan record request)' : null,
          scenario.blockers.unpaidChallansCount > 0
            ? `${scenario.blockers.unpaidChallansCount} unpaid e-challan (INR ${scenario.blockers.unpaidChallansAmount})`
            : null,
        ].filter(Boolean),
        rulesUnknownForDestination: ctx.isDegraded,
        ruleChecksFailed: currentPlan.checks.filter((c) => !c.passed).map((c) => c.ruleName),
        currentChoices: ctx.decisions,
      };
    }

    case 'list_steps':
      return [...currentPlan.tasks]
        .sort((a, b) => a.start - b.start || a.end - b.end)
        .map((t) => ({
          step: t.name,
          startDay: t.start,
          endDay: t.end,
          latestSafeStartDay: t.lsd,
          status: t.status,
          why: t.why,
        }));

    case 'explain_step': {
      const q = String(args.name ?? '').toLowerCase().trim();
      if (!q) return { error: 'Say which step.' };
      const task = currentPlan.tasks.find((t) => t.name.toLowerCase().includes(q) || t.id.includes(q));
      if (!task) return { error: `No step matches "${q}".`, steps: currentPlan.tasks.map((t) => t.name) };
      const nameOf = (id: string) => currentPlan.tasks.find((t) => t.id === id)?.name ?? id;
      return {
        step: task.name,
        why: task.why,
        basis: task.basis,
        assumedTiming: Boolean(task.uncertain),
        startDay: task.start,
        endDay: task.end,
        latestSafeStartDay: task.lsd,
        status: task.status,
        comesAfter: currentPlan.links
          .filter((l) => l.to === task.id)
          .map((l) => ({ step: nameOf(l.from), link: l.type, reason: l.reason, verified: l.verified })),
        comesBefore: currentPlan.links
          .filter((l) => l.from === task.id)
          .map((l) => ({ step: nameOf(l.to), link: l.type, reason: l.reason, warning: l.warning })),
      };
    }

    case 'get_fees':
      return {
        officialTotalInr: currentPlan.fees.officialTotal,
        officialTotalVerified: !currentPlan.fees.hasUnverified,
        estimatedItems: currentPlan.fees.estimateCount,
        items: currentPlan.fees.items.map((f) => ({
          fee: f.label,
          type: f.tag,
          amountInr: f.amount,
          verified: f.verified,
        })),
      };

    case 'compare_routes':
      return ctx.optionsComparison.slice(0, 3).map((o) => ({
        rank: o.rank,
        licenceRoute: o.decisions.licenceRoute,
        form35: o.decisions.form35,
        everythingDoneByDay: o.expectedPlan.finish,
        ifSlowDay: o.slowPlan.finish,
        rtoVisits: o.visitCount,
        licenceLapseDays: o.licenceLapseDays,
        tradeOff: o.tradeOff,
        unverified: o.unverifiedRuleImpact ?? null,
      }));

    case 'what_if': {
      const days = typeof args.days === 'number' && Number.isFinite(args.days) ? Math.round(args.days) : undefined;
      const events: Record<string, PlanningEvent> = {
        slot_queue_longer: { type: 'slotCollapse', queueDays: Math.min(60, Math.max(1, days ?? 28)) },
        trip_longer: { type: 'tripExtended', additionalDays: Math.min(60, Math.max(1, days ?? 7)) },
        form35_rejected: { type: 'formRejected', day: 5 },
        aadhaar_updated_early: { type: 'aadhaarEarly', day: 0 },
      };
      const evt = events[String(args.change)];
      if (!evt) return { error: 'Unknown change.', allowed: Object.keys(events) };
      const run = (list: readonly PlanningEvent[]): PlanResult => {
        let input: PlanInput = { scenario, mergedPack: ctx.rulePack, decisions: ctx.decisions, events: list };
        for (const e of list) input = applyEvent(input, e);
        return planScenario(input);
      };
      const after = run([...ctx.activeEvents, evt]);
      const d = diffPlans(currentPlan, after);
      return {
        change: args.change,
        before: brief(currentPlan),
        after: brief(after),
        finishMovedByDays: d.finishChange,
        stepsAdded: d.tasksAdded,
        note: 'This was a simulation only. Nothing in the app was changed.',
      };
    }

    case 'get_sources':
      return ctx.sources.map((s) => ({ id: s.id, title: s.title, publisher: s.publisher, kind: s.kind, verified: s.verified }));

    case 'open_page': {
      const path = PAGE_PATHS[String(args.page)];
      if (!path) return { error: 'Unknown page.', allowed: Object.keys(PAGE_PATHS) };
      effects.navigate(path);
      return { opened: path };
    }

    default:
      return { error: `Unknown tool ${name}.` };
  }
}
