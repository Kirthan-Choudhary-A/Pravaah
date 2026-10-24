/**
 * Pure Option Comparator and Explainer
 * Evaluates all decision combinations under expected and slow timings.
 * Strict multi-criteria ranking order with deterministic tie-breaking.
 */

import type {
  PlanInput,
  OptionComparison,
  Form35Decision,
  LicenceRouteDecision,
  Decisions,
} from '../model/types';
import { planScenario } from '../planner';

export function compareOptions(input: PlanInput): OptionComparison[] {
  const { scenario, mergedPack } = input;

  const form35Options: Form35Decision[] =
    scenario.blockers.form35Open && !scenario.move.isBHSeries
      ? ['resolve', 'withdraw', 'wait']
      : ['resolve']; // default placeholder if no Form 35 open

  const licenceRoutes: LicenceRouteDecision[] = ['online', 'rto-visit', 'another-date'];
  if (
    mergedPack.licenceRenewalAtAnyRTO.value &&
    scenario.alternativeSlots &&
    scenario.alternativeSlots.length > 0
  ) {
    licenceRoutes.push('another-rto');
  }

  const combinations: Decisions[] = [];

  for (const f35 of form35Options) {
    for (const lr of licenceRoutes) {
      if (lr === 'another-rto') {
        const altCode = scenario.alternativeSlots?.[0]?.rtoCode ?? 'KA-01';
        combinations.push({ form35: f35, licenceRoute: lr, alternativeRTO: altCode });
      } else {
        combinations.push({ form35: f35, licenceRoute: lr });
      }
    }
  }

  const comparisons: OptionComparison[] = [];

  for (const combo of combinations) {
    const expectedPlan = planScenario({
      ...input,
      decisions: combo,
      isSlow: false,
    });

    const slowPlan = planScenario({
      ...input,
      decisions: combo,
      isSlow: true,
    });

    // A lapsed licence means driving illegally, so it outranks every other consideration.
    const lapseDays = (plan: typeof expectedPlan): number => {
      const dl = plan.tasks.find((t) => t.id === 'task-licence-renewal');
      return dl ? Math.max(0, dl.end - input.scenario.licenceExpiryDay) : 0;
    };
    const licenceLapseDays = lapseDays(expectedPlan);
    const slowLicenceLapseDays = lapseDays(slowPlan);

    // Compute metrics
    const deadlineBreaches = expectedPlan.tasks.filter((t) => t.status === 'Missed').length;
    const slowDeadlineBreaches = slowPlan.tasks.filter((t) => t.status === 'Missed').length;
    const unknownStepsCount = expectedPlan.tasks.filter((t) => t.unknown).length;
    const failedChecksCount = expectedPlan.checks.filter((c) => !c.passed).length;
    const visitCount = expectedPlan.tasks.filter((t) => t.inPerson && !t.unknown).length;

    // Extra steps: e.g. bank consent or loan closure on new RC
    const extraStepsCount = expectedPlan.tasks.filter(
      (t) => t.id === 'task-bank-consent-form28' || t.id === 'task-close-loan-new-rc'
    ).length;

    // Generate explanations
    const reasons: string[] = [];
    let tradeOff = '';
    let fallbackLine = '';

    if (combo.form35 === 'resolve') {
      reasons.push(
        'Resolving Form 35 via grievance avoids carrying the loan to the new RC (₹500 hypothecation fee) and closing it again there (+10 days).'
      );
      tradeOff =
        'Requires 9–15 days for parent bank grievance escalation before NOC can be requested.';
      fallbackLine =
        'If grievance resolution fails or is rejected, the workflow must fall back to bank consent on Form 28 (+7 days).';
    } else if (combo.form35 === 'withdraw') {
      reasons.push('Withdrawing pending Form 35 unblocks immediate NOC filing within 2 days.');
      tradeOff =
        'Carries loan hypothecation to destination state (+₹500 fee and +10 days to re-file closure on new RC).';
      fallbackLine = 'Requires financier cooperation to sign Form 28 for inter-state removal.';
    } else {
      reasons.push(
        'Waiting for normal Form 35 administrative processing avoids re-filing fees on the new RC.'
      );
      tradeOff =
        'Long turnaround (21–35 days) significantly delays NOC issuance and overall plan completion.';
      fallbackLine =
        'If normal clearance exceeds 30 days, re-registration timeline may become compressed.';
    }

    if (combo.licenceRoute === 'online') {
      reasons.push(
        'Online Aadhaar e-KYC renewal bypasses physical RTO appointment queues entirely, completing in 5 days.'
      );
    } else if (combo.licenceRoute === 'another-rto') {
      reasons.push(
        `Routing to ${combo.alternativeRTO} accesses earlier appointment slots than the primary RTO.`
      );
    } else if (combo.licenceRoute === 'another-date') {
      reasons.push(
        'Deferred visit ensures owner has returned from travel before attending RTO counter.'
      );
    } else {
      reasons.push(
        'In-person RTO counter visit subject to local appointment waiting queues and absence windows.'
      );
    }

    // Check if unverified rule impacts the winner
    let unverifiedRuleImpact: string | undefined;
    if (
      mergedPack.licenceRenewalAtAnyRTO.verified === false &&
      combo.licenceRoute === 'another-rto'
    ) {
      unverifiedRuleImpact =
        'Recommendation depends on unverified rule: licenceRenewalAtAnyRTO (Section 15 cross-RTO renewal).';
    }

    comparisons.push({
      decisions: combo,
      expectedPlan,
      slowPlan,
      rank: 0,
      reasons: reasons.slice(0, 3),
      tradeOff,
      fallbackLine,
      ...(unverifiedRuleImpact ? { unverifiedRuleImpact } : {}),
      extraStepsCount,
      visitCount,
      licenceLapseDays,
      slowLicenceLapseDays,
      deadlineBreaches,
      slowDeadlineBreaches,
      unknownStepsCount,
      failedChecksCount,
    });
  }

  // Multi-criteria sorting
  // 0. licence lapse days (expected, then slow case)
  // 1. deadline breaches
  // 2. slow-case breaches
  // 3. unknown steps
  // 4. failed checks
  // 5. finish day
  // 6. slow-case finish
  // 7. extra steps
  // 8. official fees
  // 9. number of visits
  comparisons.sort((a, b) => {
    if (a.licenceLapseDays !== b.licenceLapseDays) return a.licenceLapseDays - b.licenceLapseDays;
    if (a.slowLicenceLapseDays !== b.slowLicenceLapseDays)
      return a.slowLicenceLapseDays - b.slowLicenceLapseDays;
    if (a.deadlineBreaches !== b.deadlineBreaches) return a.deadlineBreaches - b.deadlineBreaches;
    if (a.slowDeadlineBreaches !== b.slowDeadlineBreaches)
      return a.slowDeadlineBreaches - b.slowDeadlineBreaches;
    if (a.unknownStepsCount !== b.unknownStepsCount)
      return a.unknownStepsCount - b.unknownStepsCount;
    if (a.failedChecksCount !== b.failedChecksCount)
      return a.failedChecksCount - b.failedChecksCount;
    if (a.expectedPlan.finish !== b.expectedPlan.finish)
      return a.expectedPlan.finish - b.expectedPlan.finish;
    if (a.slowPlan.finish !== b.slowPlan.finish) return a.slowPlan.finish - b.slowPlan.finish;
    if (a.extraStepsCount !== b.extraStepsCount) return a.extraStepsCount - b.extraStepsCount;
    if (a.expectedPlan.fees.officialTotal !== b.expectedPlan.fees.officialTotal) {
      return a.expectedPlan.fees.officialTotal - b.expectedPlan.fees.officialTotal;
    }
    return a.visitCount - b.visitCount;
  });

  return comparisons.map((comp, idx) => ({
    ...comp,
    rank: idx + 1,
  }));
}
