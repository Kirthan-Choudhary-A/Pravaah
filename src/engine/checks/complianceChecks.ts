/**
 * Pure Compliance and Legal Validation Checks
 * Evaluates rule compliance against statutory deadlines, dependency ordering, and licence stages.
 */

import type {
  RulePack,
  Scenario,
  ScheduledTask,
  CheckResult,
  LicenceStageRow,
  PlanningEvent,
} from '../model/types';

export function licenceStages(pack: RulePack, expiryDay: number): readonly LicenceStageRow[] {
  const config = pack.licenceStages;
  const windowStart = Math.max(0, expiryDay - config.renewalWindowDays);
  const graceEnd = expiryDay + config.graceDays;
  const testThreshold = expiryDay + config.testAfterDays;

  return [
    {
      stage: 'Renewal Window',
      interval: `Day ${windowStart} – Day ${expiryDay}`,
      drivingAllowed: true,
      lateFeeAmount: 0,
      testRequired: false,
      note: `Statutory application window open (${config.renewalWindowDays} days prior to expiry under Section 15).`,
    },
    {
      stage: 'Grace Period',
      interval: `Day ${expiryDay} – Day ${graceEnd}`,
      drivingAllowed: config.graceDays > 0 && config.drivingAllowedDuringGrace,
      lateFeeAmount:
        config.graceDays > 0 && config.drivingAllowedDuringGrace ? 0 : config.lateFee.base,
      testRequired: false,
      note: config.drivingAllowedDuringGrace
        ? `Statutory grace period under Section 15 proviso; driving permitted for ${config.graceDays} days.`
        : 'Grace period for renewal; driving on expired licence prohibited.',
    },
    {
      stage: 'Expired (Late Fee Active)',
      interval: `Day ${graceEnd} – Day ${testThreshold}`,
      drivingAllowed: false,
      lateFeeAmount: config.lateFee.base,
      testRequired: false,
      note: `Licence lapsed beyond grace period; driving strictly prohibited under Section 3; statutory late fee ₹${config.lateFee.base} applies.`,
    },
    {
      stage: 'Re-Test Required',
      interval: `Day ${testThreshold}+`,
      drivingAllowed: false,
      lateFeeAmount: config.lateFee.base + config.lateFee.perYear,
      testRequired: true,
      note: `Expired over ${config.testAfterDays} days; mandatory driving competence re-test required under Section 15(4).`,
    },
  ];
}

export function runChecks(
  tasks: readonly ScheduledTask[],
  scenario: Scenario,
  mergedPack: RulePack,
  events: readonly PlanningEvent[] = []
): CheckResult[] {
  const results: CheckResult[] = [];

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Effective absence window
  const absenceStart = scenario.absence.start;
  let absenceEnd = scenario.absence.end;
  const tripExtendedEvent = events.find((e) => e.type === 'tripExtended');
  if (tripExtendedEvent) {
    absenceEnd += tripExtendedEvent.additionalDays ?? 7;
  }

  // 1. Licence valid while driving
  const dlTask = taskMap.get('task-licence-renewal');
  if (dlTask && !dlTask.unknown) {
    const expiry = scenario.licenceExpiryDay;
    const graceAllowed = mergedPack.licenceStages.drivingAllowedDuringGrace;
    const graceLimit = expiry + (graceAllowed ? mergedPack.licenceStages.graceDays : 0);

    const isRenewalTimely = dlTask.end <= graceLimit;
    results.push({
      id: 'check-licence-validity',
      ruleName: 'Licence Valid While Driving',
      sourceName: 'mva-1988-s14',
      passed: isRenewalTimely,
      message: isRenewalTimely
        ? `Licence renewal completes on Day ${dlTask.end}, within valid authorization limit (Day ${graceLimit}).`
        : `Driving licence lapses by ${dlTask.end - expiry} days before renewal completion on Day ${dlTask.end} (expired on Day ${expiry}).`,
      details: `Section 14 & 15: Expiry Day ${expiry}, Grace Period Limit Day ${graceLimit}.`,
    });
  }

  // 2. Renewal filed in the allowed window
  if (dlTask && !dlTask.unknown) {
    const windowStart = Math.max(
      0,
      scenario.licenceExpiryDay - mergedPack.licenceStages.renewalWindowDays
    );
    const testLimit = scenario.licenceExpiryDay + mergedPack.licenceStages.testAfterDays;
    const isWithinWindow = dlTask.start >= windowStart && dlTask.start <= testLimit;

    results.push({
      id: 'check-renewal-window',
      ruleName: 'Renewal Filed Within Statutory Window',
      sourceName: 'mva-1988-s15',
      passed: isWithinWindow,
      message: isWithinWindow
        ? `Renewal application initiated on Day ${dlTask.start}, comfortably within statutory window.`
        : `Renewal application initiated outside statutory window (Day ${dlTask.start}).`,
    });
  }

  // 3. Re-registration within its limit
  const reRegTask = taskMap.get('task-re-registration-form27');
  if (reRegTask) {
    if (reRegTask.unknown) {
      results.push({
        id: 'check-re-registration-limit',
        ruleName: 'Re-Registration Within 12-Month Limit',
        sourceName: 'mva-1988-s47',
        passed: false,
        message:
          'Destination jurisdiction rules are unmapped (degraded mode); statutory re-registration schedule cannot be validated.',
      });
    } else {
      const limit = scenario.move.movedOnDay + mergedPack.reRegistrationLimitDays.value;
      const passed = reRegTask.end <= limit;
      results.push({
        id: 'check-re-registration-limit',
        ruleName: 'Re-Registration Within 12-Month Limit',
        sourceName: 'mva-1988-s47',
        passed,
        message: passed
          ? `Vehicle re-registration completed on Day ${reRegTask.end}, well within statutory limit of ${mergedPack.reRegistrationLimitDays.value} days (Day ${limit}).`
          : `Re-registration completes on Day ${reRegTask.end}, exceeding statutory limit of Day ${limit}.`,
      });
    }
  }

  // 4. RC address intimation within its limit (Section 49 MVA)
  const rcAddressTask = taskMap.get('task-rc-address-intimation');
  if (rcAddressTask && !rcAddressTask.unknown) {
    const limit = scenario.move.movedOnDay + mergedPack.rcAddressIntimationDays.value;
    const passed = rcAddressTask.end <= limit;
    results.push({
      id: 'check-rc-address-intimation',
      ruleName: 'RC Address Intimation Within 30 Days',
      sourceName: 'mva-1988-s49',
      passed,
      message: passed
        ? `Section 49 change of residence intimation completed on Day ${rcAddressTask.end}, within mandatory ${mergedPack.rcAddressIntimationDays.value}-day limit (Day ${limit}).`
        : `RC address intimation completes on Day ${rcAddressTask.end}, exceeding statutory 30-day deadline (Day ${limit}).`,
    });
  }

  // 5. NOC prerequisites in place before NOC starts
  const nocTask = taskMap.get('task-noc-form28');
  if (nocTask && !nocTask.unknown) {
    let prereqsPassed = true;
    const reasons: string[] = [];

    const challanTask = taskMap.get('task-pay-echallan');
    if (challanTask && challanTask.end > nocTask.start) {
      prereqsPassed = false;
      reasons.push(
        `Unpaid challan cleared on Day ${challanTask.end} after NOC started on Day ${nocTask.start}`
      );
    }

    const form35Task = taskMap.get('task-form35-action');
    if (form35Task && form35Task.end > nocTask.start) {
      prereqsPassed = false;
      reasons.push(
        `Form 35 cleared on Day ${form35Task.end} after NOC started on Day ${nocTask.start}`
      );
    }

    const bankConsentTask = taskMap.get('task-bank-consent-form28');
    if (bankConsentTask && bankConsentTask.end > nocTask.start) {
      prereqsPassed = false;
      reasons.push(
        `Bank consent received on Day ${bankConsentTask.end} after NOC started on Day ${nocTask.start}`
      );
    }

    results.push({
      id: 'check-noc-prerequisites',
      ruleName: 'NOC Prerequisites Satisfied Before Filing',
      sourceName: 'mva-1988-s48',
      passed: prereqsPassed,
      message: prereqsPassed
        ? `All statutory clearances (challans, lien status, financier consent) were in place on or before NOC start on Day ${nocTask.start}.`
        : `NOC prerequisites violated: ${reasons.join('; ')}.`,
    });
  }

  // 6. Aadhaar changed after NOC
  const aadhaarTask = taskMap.get('task-aadhaar-update');
  if (nocTask && aadhaarTask) {
    const passed = aadhaarTask.start >= nocTask.end;
    results.push({
      id: 'check-aadhaar-after-noc',
      ruleName: 'Aadhaar Address Updated After NOC Issuance',
      sourceName: 'portal-parivahan',
      passed,
      message: passed
        ? `Aadhaar address update initiated on Day ${aadhaarTask.start}, safely following NOC issuance on Day ${nocTask.end}.`
        : `Aadhaar address was updated on Day ${aadhaarTask.start} prior to NOC issuance (Day ${nocTask.end}), causing parent RTO address verification failure.`,
    });
  }

  // 7. Owner in town for every in-person visit
  const inPersonTasks = tasks.filter((t) => t.inPerson && !t.unknown);
  let allVisitsInTown = true;
  const visitViolations: string[] = [];

  for (const t of inPersonTasks) {
    if (t.start >= absenceStart && t.start < absenceEnd) {
      allVisitsInTown = false;
      visitViolations.push(
        `${t.name} scheduled on Day ${t.start} during scheduled absence (Days ${absenceStart}–${absenceEnd})`
      );
    }
  }

  results.push({
    id: 'check-owner-in-town',
    ruleName: 'Owner Present for In-Person RTO Visits',
    sourceName: 'portal-sarathi',
    passed: allVisitsInTown,
    message: allVisitsInTown
      ? `All ${inPersonTasks.length} in-person appointments fall on dates when the owner is in town.`
      : `In-person appointment scheduled during absence: ${visitViolations.join('; ')}.`,
  });

  return results;
}
