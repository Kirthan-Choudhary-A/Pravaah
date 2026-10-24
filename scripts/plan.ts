/**
 * Pravaah Terminal Plan Preview Script
 * Usage:
 *   npm run plan -- --scenario A
 *   npm run plan -- --scenario A --event formRejected
 *   npm run plan -- --scenario A --slot 28 --compare
 */

import { loadScenario, loadMergedRulePack } from '../src/data/index';
import {
  planScenario,
  compareOptions,
  applyEvent,
  type Decisions,
  type PlanningEvent,
  type PlanInput,
} from '../src/engine/index';

function parseArgs(): {
  scenarioId: string;
  eventName?: string;
  slotQueue?: number;
  compare: boolean;
} {
  const args = process.argv.slice(2);
  let scenarioId = 'A';
  let eventName: string | undefined;
  let slotQueue: number | undefined;
  let compare = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--scenario' && i + 1 < args.length) {
      scenarioId = args[++i]!;
    } else if (arg === '--event' && i + 1 < args.length) {
      eventName = args[++i];
    } else if (arg === '--slot' && i + 1 < args.length) {
      slotQueue = parseInt(args[++i]!, 10);
    } else if (arg === '--compare') {
      compare = true;
    }
  }

  return { scenarioId, eventName, slotQueue, compare };
}

function printDivider(title?: string): void {
  if (title) {
    console.log(`\n=== ${title} ${'='.repeat(Math.max(2, 60 - title.length))}`);
  } else {
    console.log('─'.repeat(65));
  }
}

function run(): void {
  const { scenarioId, eventName, slotQueue, compare } = parseArgs();

  const scenario = loadScenario(scenarioId);
  const mergedPack = loadMergedRulePack(scenario.move.toState);

  const defaultDecisions: Decisions = {
    form35: 'resolve',
    licenceRoute: 'online',
  };

  const events: PlanningEvent[] = [];
  if (eventName) {
    if (eventName === 'formRejected') {
      events.push({ type: 'formRejected', day: 5 });
    } else if (eventName === 'aadhaarEarly') {
      events.push({ type: 'aadhaarEarly', day: 0 });
    } else if (eventName === 'slotCollapse') {
      events.push({ type: 'slotCollapse', queueDays: slotQueue ?? 28 });
    } else if (eventName === 'tripExtended') {
      events.push({ type: 'tripExtended', additionalDays: 7 });
    } else if (eventName === 'unknownJurisdiction') {
      events.push({ type: 'unknownJurisdiction', targetState: 'SK' });
    }
  }

  if (slotQueue !== undefined && !eventName) {
    events.push({ type: 'slotCollapse', queueDays: slotQueue });
  }

  let planInput: PlanInput = {
    scenario,
    mergedPack,
    decisions: defaultDecisions,
    events,
  };

  if (events.length > 0) {
    for (const ev of events) {
      planInput = applyEvent(planInput, ev);
    }
  }

  if (compare) {
    printDivider(`OPTION COMPARISON: SCENARIO ${scenarioId.toUpperCase()}`);
    console.log(
      `Vehicle Move: ${scenario.move.fromRTO} -> ${scenario.move.toRTO} (${scenario.move.vehicleType})`
    );
    console.log(
      `Licence Expiry: Day ${scenario.licenceExpiryDay} | Primary Slot Queue: ${slotQueue ?? scenario.primarySlotQueue} days`
    );
    console.log(`Owner Absence: Days ${scenario.absence.start}–${scenario.absence.end}`);
    if (events.length > 0) {
      console.log(`Active Events: ${events.map((e) => e.type).join(', ')}`);
    }

    const comparisons = compareOptions(planInput);

    console.log('\nRANKED PATHWAYS:');
    printDivider();
    for (const comp of comparisons) {
      const d = comp.decisions;
      const f35 = d.form35.toUpperCase();
      const lr = d.licenceRoute + (d.alternativeRTO ? ` (${d.alternativeRTO})` : '');
      const unv = comp.unverifiedRuleImpact ? ` [!] ${comp.unverifiedRuleImpact}` : '';

      console.log(
        `Rank #${comp.rank}: Form 35 [${f35}] + Licence [${lr}]${unv}\n` +
          `  Expected Finish: Day ${comp.expectedPlan.finish} | Slow Finish: Day ${comp.slowPlan.finish}\n` +
          `  Official Fees: ₹${comp.expectedPlan.fees.officialTotal} | In-Person Visits: ${comp.visitCount} | Deadline Breaches: ${comp.deadlineBreaches}\n` +
          `  Reasons:`
      );
      for (const r of comp.reasons) {
        console.log(`    • ${r}`);
      }
      console.log(`  Trade-off: ${comp.tradeOff}`);
      console.log(`  Fallback: ${comp.fallbackLine}\n`);
    }

    const best = comparisons[0]!;
    printDivider('BEST PATHWAY DETAILED PLAN');
    printPlanDetails(best.expectedPlan);
  } else {
    printDivider(`PLAN: SCENARIO ${scenarioId.toUpperCase()}`);
    console.log(`Case: ${scenario.name}`);
    console.log(
      `Move: ${scenario.move.fromRTO} -> ${scenario.move.toRTO} | Vehicle: ${scenario.move.vehicleType}`
    );
    console.log(
      `Primary Slot Queue: ${slotQueue ?? scenario.primarySlotQueue} days | Licence Expiry: Day ${scenario.licenceExpiryDay}`
    );
    console.log(`Absence Window: Days ${scenario.absence.start}–${scenario.absence.end}`);
    if (events.length > 0) {
      console.log(`Events: ${events.map((e) => e.type).join(', ')}`);
    }

    const plan = planScenario(planInput);
    printPlanDetails(plan);
  }
}

function printPlanDetails(plan: ReturnType<typeof planScenario>): void {
  printDivider('TASKS & SCHEDULE');
  console.log(
    'ID'.padEnd(28) +
      'Lane'.padEnd(10) +
      'Start'.padEnd(7) +
      'End'.padEnd(6) +
      'LSD'.padEnd(6) +
      'Slack'.padEnd(7) +
      'Status'.padEnd(10) +
      'Type'
  );
  printDivider();

  for (const t of plan.tasks) {
    const id = t.id.padEnd(28);
    const lane = t.lane.padEnd(10);
    const start = t.unknown ? '—'.padEnd(7) : `Day ${t.start}`.padEnd(7);
    const end = t.unknown ? '—'.padEnd(6) : `${t.end}`.padEnd(6);
    const lsd = t.unknown ? '—'.padEnd(6) : `${t.lsd}`.padEnd(6);
    const slack = t.unknown ? '—'.padEnd(7) : `${t.slack}`.padEnd(7);
    const status = t.status.padEnd(10);
    const type = t.inPerson ? 'In-Person' : 'Online/Doc';

    console.log(`${id}${lane}${start}${end}${lsd}${slack}${status}${type}`);
  }

  printDivider('DEPENDENCY LINKS');
  for (const l of plan.links) {
    console.log(`[${l.type.toUpperCase()}] ${l.from} -> ${l.to}`);
    console.log(`   Reason: ${l.reason}`);
  }

  printDivider('COMPLIANCE CHECKS');
  for (const c of plan.checks) {
    const status = c.passed ? '[PASS]' : '[FAIL]';
    console.log(`${status} ${c.ruleName} (${c.sourceName})`);
    console.log(`   ${c.message}`);
  }

  printDivider('FEE BREAKDOWN');
  for (const f of plan.fees.items) {
    const amt = f.amount !== null ? `₹${f.amount}` : 'TBD / Variable';
    const tag = `[${f.tag}]`.padEnd(11);
    console.log(`${tag} ${f.label.padEnd(48)}: ${amt}`);
  }
  printDivider();
  console.log(
    `Official Total Summed: ₹${plan.fees.officialTotal} (Verified: ${!plan.fees.hasUnverified})`
  );
  console.log(
    `Estimates: ${plan.fees.estimateCount} items | Hidden (Unknown State): ${plan.fees.hiddenCount} items`
  );

  printDivider('SUMMARY');
  console.log(`Plan Finish Day: Day ${plan.finish}`);
  console.log(`Finishing Task:  ${plan.finishingTask}`);
  console.log(`Critical Path:   ${plan.criticalPath.join(' -> ')}`);
  console.log(
    `Binding Limit:   [${plan.bindingConstraint.type.toUpperCase()}] ${plan.bindingConstraint.description}`
  );
  printDivider();
}

run();
