/**
 * Pure Task Builder
 * Creates domain tasks from scenario parameters, rule pack data, and citizen decisions.
 * Plain-English 'why' is generated dynamically from data rules, not hardcoded per scenario.
 */

import type { Scenario, RulePack, Decisions, PlanningEvent, Task } from './types';

export interface BuildTasksOptions {
  readonly isSlow?: boolean;
  readonly isDegraded?: boolean;
}

export function buildTasks(
  scenario: Scenario,
  mergedPack: RulePack,
  decisions: Decisions,
  events: readonly PlanningEvent[] = [],
  options: BuildTasksOptions = {}
): Task[] {
  const { isSlow = false, isDegraded = false } = options;
  const tasks: Task[] = [];

  // Check event flags
  const formRejectedEvent = events.find((e) => e.type === 'formRejected');
  const aadhaarEarlyEvent = events.find((e) => e.type === 'aadhaarEarly');

  const isBH = scenario.move.isBHSeries;

  // 1. Residential Rental Agreement (Address Proof)
  if (!isBH) {
    tasks.push({
      id: 'task-rental-agreement',
      name: 'Execute Registered Rental Agreement',
      lane: 'identity',
      duration: 3,
      inPerson: false,
      basis: 'statute',
      sourceIds: ['mva-1988-s47', 'portal-parivahan'],
      why: 'Required by the destination RTO as legal residential address proof before re-registration or local address modification.',
    });
  }

  // 2. Clear Unpaid e-Challan (if any exist)
  if (scenario.blockers.unpaidChallansCount > 0) {
    tasks.push({
      id: 'task-pay-echallan',
      name: 'Clear Pending Traffic e-Challans',
      lane: 'vehicle',
      duration: 1,
      inPerson: false,
      basis: 'modelled',
      sourceIds: ['portal-parivahan'],
      why: `The parent RTO (${scenario.move.fromRTO}) blocks NOC issuance while ${scenario.blockers.unpaidChallansCount} unpaid traffic violation dues (₹${scenario.blockers.unpaidChallansAmount}) remain unresolved.`,
    });
  }

  // 3. Form 35 Hypothecation / Bank Clearance (Non-BH only)
  let loanCarriesToNewRC = false;

  if (!isBH && scenario.blockers.form35Open) {
    if (formRejectedEvent) {
      loanCarriesToNewRC = true;
      tasks.push({
        id: 'task-form35-rejected',
        name: 'Form 35 Rejection Processing',
        lane: 'vehicle',
        duration: formRejectedEvent.day ?? 5,
        inPerson: false,
        uncertain: true,
        basis: 'modelled',
        sourceIds: ['cmvr-1989-r81'],
        why: 'The unilateral hypothecation removal was rejected by the parent RTO, requiring formal bank consent to move the vehicle.',
      });

      tasks.push({
        id: 'task-bank-consent-form28',
        name: 'Obtain Financier Consent on Form 28',
        lane: 'vehicle',
        duration: scenario.timings.bankConsentForm28Days,
        inPerson: false,
        basis: 'statute',
        sourceIds: ['mva-1988-s48', 'cmvr-1989-r81'],
        why: 'Because loan termination was rejected, Section 48 requires the registered financier to sign Form 28 permitting inter-state removal with the active hypothecation.',
      });
    } else {
      switch (decisions.form35) {
        case 'resolve':
          tasks.push({
            id: 'task-form35-action',
            name: 'Grievance Resolution of Open Form 35',
            lane: 'vehicle',
            duration: isSlow ? 15 : 9,
            inPerson: false,
            uncertain: true,
            basis: 'modelled',
            sourceIds: ['portal-parivahan'],
            why: 'Filing an escalation grievance with the financier and parent RTO to formally close the loan record before requesting an NOC.',
          });
          break;
        case 'withdraw':
          loanCarriesToNewRC = true;
          tasks.push({
            id: 'task-form35-action',
            name: 'Withdraw Pending Form 35 Application',
            lane: 'vehicle',
            duration: 2,
            inPerson: false,
            basis: 'modelled',
            sourceIds: ['portal-vahan'],
            why: 'Withdrawing the unverified Form 35 request unfreezes the vehicle record at the parent RTO, allowing NOC processing while keeping the loan active.',
          });
          tasks.push({
            id: 'task-bank-consent-form28',
            name: 'Obtain Financier Consent on Form 28',
            lane: 'vehicle',
            duration: scenario.timings.bankConsentForm28Days,
            inPerson: false,
            basis: 'statute',
            sourceIds: ['mva-1988-s48'],
            why: 'Because the loan remains open, the financier must endorse Form 28 allowing inter-state removal.',
          });
          break;
        case 'wait':
        default:
          tasks.push({
            id: 'task-form35-action',
            name: 'Await Normal Form 35 Clearance',
            lane: 'vehicle',
            duration: isSlow ? 35 : 21,
            inPerson: false,
            uncertain: true,
            basis: 'modelled',
            sourceIds: ['portal-vahan'],
            why: 'Waiting for the parent RTO and lending institution to complete normal administrative processing of hypothecation cancellation.',
          });
          break;
      }
    }
  }

  // 4. No Objection Certificate (Form 28) from Parent State (Non-BH only)
  if (!isBH) {
    let nocDuration = scenario.timings.nocProcessingDays;
    let nocNote = `Statutory certificate under Section 48 required by ${scenario.move.toState} before assigning a new registration mark.`;
    if (aadhaarEarlyEvent) {
      nocDuration += 17; // +7 rework + 10 resubmission
      nocNote +=
        ' (Includes 17-day penalty for re-issuing NOC due to premature Aadhaar address update mismatch).';
    }

    tasks.push({
      id: 'task-noc-form28',
      name: `Obtain Form 28 NOC from ${scenario.move.fromRTO}`,
      lane: 'vehicle',
      duration: nocDuration,
      inPerson: false,
      basis: 'statute',
      sourceIds: ['mva-1988-s48'],
      why: nocNote,
    });
  }

  // 5. Re-registration (Form 27) in Destination State (Non-BH only)
  if (!isBH) {
    const isDestUnknown = isDegraded || scenario.move.toState === 'SK';
    tasks.push({
      id: 'task-re-registration-form27',
      name: `In-Person Vehicle Inspection & Re-Registration (${scenario.move.toRTO})`,
      lane: 'vehicle',
      duration: isDestUnknown ? 0 : 4,
      inPerson: !isDestUnknown,
      unknown: isDestUnknown,
      deadline: scenario.move.movedOnDay + mergedPack.reRegistrationLimitDays.value,
      basis: 'statute',
      sourceIds: ['mva-1988-s47'],
      why: isDestUnknown
        ? `Statutory re-registration under Section 47 for ${scenario.move.toState}; procedures and appointment slots are unmapped in this jurisdiction.`
        : `Section 47 mandates vehicle inspection at ${scenario.move.toRTO} and assignment of new state registration within 12 months of relocation.`,
    });
  }

  // 6. Close Loan on New RC (if loan carried over to new state)
  if (loanCarriesToNewRC && !isBH) {
    tasks.push({
      id: 'task-close-loan-new-rc',
      name: 'Re-file Hypothecation Termination on New State RC',
      lane: 'vehicle',
      duration: 10,
      inPerson: false,
      basis: 'modelled',
      sourceIds: ['cmvr-1989-r81'],
      why: 'Because the vehicle moved with active hypothecation, the loan closure (Form 35) must be formally submitted and stamped on the newly issued RC.',
    });
  }

  // 7. Aadhaar Demographic Address Update
  tasks.push({
    id: 'task-aadhaar-update',
    name: 'Update Residential Address on Aadhaar (UIDAI)',
    lane: 'identity',
    duration: aadhaarEarlyEvent ? 0 : 7,
    inPerson: false,
    basis: 'modelled',
    sourceIds: ['portal-parivahan'],
    why: 'UIDAI-verified address proof is required to authenticate digital address change on the Sarathi driving licence portal.',
  });

  // 8. Driving Licence Renewal
  const dlExpiry = scenario.licenceExpiryDay;
  const dlDeadline = dlExpiry;

  let dlDuration = 5;
  let dlInPerson = false;
  let dlName = 'Online Driving Licence Renewal (Aadhaar e-KYC)';
  let dlWhy = `Section 15 renewal filed before expiry (Day ${dlExpiry}) to avoid lapse of driving privileges and statutory late fees.`;

  switch (decisions.licenceRoute) {
    case 'rto-visit':
      dlDuration = 3;
      dlInPerson = true;
      dlName = `In-Person Driving Licence Renewal (${scenario.move.toRTO})`;
      dlWhy = `In-person biometric capture and renewal at ${scenario.move.toRTO} counter.`;
      break;
    case 'another-rto': {
      dlDuration = 3;
      dlInPerson = true;
      const altRTO =
        decisions.alternativeRTO ?? scenario.alternativeSlots?.[0]?.rtoCode ?? 'Alternative RTO';
      dlName = `In-Person Driving Licence Renewal at Alternative RTO (${altRTO})`;
      dlWhy = `Section 15 allows renewal by any licensing authority; routed to ${altRTO} to bypass primary RTO slot queues.`;
      break;
    }
    case 'another-date':
      dlDuration = 3;
      dlInPerson = true;
      dlName = `Deferred In-Person Driving Licence Renewal (${scenario.move.toRTO})`;
      dlWhy = `In-person renewal scheduled after returning from scheduled travel outside the jurisdiction.`;
      break;
    case 'online':
    default:
      dlDuration = 5;
      dlInPerson = false;
      dlName = 'Online Driving Licence Renewal (Aadhaar e-KYC)';
      dlWhy =
        'Aadhaar-authenticated contactless renewal via the Sarathi portal, bypassing physical RTO slot queues.';
      break;
  }

  tasks.push({
    id: 'task-licence-renewal',
    name: dlName,
    lane: 'licence',
    duration: dlDuration,
    inPerson: dlInPerson,
    deadline: dlDeadline,
    basis: 'statute',
    sourceIds: ['mva-1988-s15', 'portal-sarathi'],
    why: dlWhy,
  });

  // 9. Online Driving Licence Address Change
  tasks.push({
    id: 'task-licence-address-change',
    name: 'Online Driving Licence Address Change (Sarathi)',
    lane: 'licence',
    duration: 5,
    inPerson: false,
    basis: 'notification',
    sourceIds: ['portal-sarathi'],
    why: 'Updates driving licence address to destination residence using updated Aadhaar e-KYC proof.',
  });

  // 10. RC Change-of-Address Intimation (Section 49 MVA)
  tasks.push({
    id: 'task-rc-address-intimation',
    name: 'Intimate Change of Residence for RC (Form 33)',
    lane: 'vehicle',
    duration: 3,
    inPerson: false,
    deadline: scenario.move.movedOnDay + mergedPack.rcAddressIntimationDays.value,
    basis: 'statute',
    sourceIds: ['mva-1988-s49'],
    why: `Section 49 mandates reporting change of residence to the registering authority within ${mergedPack.rcAddressIntimationDays.value} days of moving (Day ${scenario.move.movedOnDay + mergedPack.rcAddressIntimationDays.value}).`,
  });

  return tasks;
}
