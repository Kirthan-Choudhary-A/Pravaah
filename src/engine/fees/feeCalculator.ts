/**
 * Pure Fee Calculator
 * Builds the fee list for a plan from the merged rule pack.
 * Only Official amounts are summed into officialTotal.
 */

import type { RulePack, Scenario, Task, FeeItem, FeeSummary } from '../model/types';

export function calculateFees(
  tasks: readonly Task[],
  scenario: Scenario,
  mergedPack: RulePack,
  isDegraded = false
): FeeSummary {
  const taskIds = new Set(tasks.map((t) => t.id));
  const items: FeeItem[] = [];

  const findPackFee = (id: string): FeeItem | undefined => {
    return mergedPack.fees.find((f) => f.id === id);
  };

  // 1. Driving Licence Renewal Fee
  if (taskIds.has('task-licence-renewal')) {
    const f = findPackFee('fee-licence-renewal');
    if (f) items.push(f);
  }

  // 2. Form 7 Smart Card Fees
  // If both renewal and address change occur, two card issuances are required
  const hasRenewal = taskIds.has('task-licence-renewal');
  const hasAddressChange = taskIds.has('task-licence-address-change');
  const cardCount = (hasRenewal ? 1 : 0) + (hasAddressChange ? 1 : 0);

  if (cardCount > 0) {
    const baseCardFee = findPackFee('fee-smart-card');
    if (baseCardFee) {
      items.push({
        ...baseCardFee,
        label:
          cardCount === 2
            ? 'Form 7 Smart Card Fee (2 issuances: renewal + address change)'
            : 'Form 7 Smart Card Fee',
        amount: (baseCardFee.amount ?? 200) * cardCount,
      });
    }
  }

  // 3. Licence Address Change Fee
  if (hasAddressChange) {
    const f = findPackFee('fee-licence-address-change');
    if (f) items.push(f);
  }

  // 4. Form 28 NOC Fee
  if (taskIds.has('task-noc-form28')) {
    const f = findPackFee('fee-noc-form28');
    if (f) items.push(f);
  }

  // 5. Re-Registration (Form 27) Fee
  if (taskIds.has('task-re-registration-form27')) {
    const isUnknownState = isDegraded || scenario.move.toState === 'SK';
    if (isUnknownState) {
      items.push({
        id: 'fee-destination-reregistration-unknown',
        label: `Destination State Re-Registration (${scenario.move.toState})`,
        amount: null,
        tag: 'Hidden',
        sourceIds: ['mva-1988-s47'],
        lastChecked: '2026-10-24',
        verified: false,
        note: `Fee schedule unmapped for ${scenario.move.toState}; marked Hidden with no amount.`,
      });
    } else {
      const isCar = scenario.move.vehicleType === 'car';
      const regFeeId = isCar ? 'fee-new-reg-mark-car' : 'fee-new-reg-mark-motorcycle';
      const f = findPackFee(regFeeId);
      if (f) items.push(f);
    }
  }

  // 6. Hypothecation Endorsement Fee on New RC (if loan carries over)
  if (taskIds.has('task-close-loan-new-rc') || taskIds.has('task-bank-consent-form28')) {
    const f = findPackFee('fee-hypothecation-endorsement');
    if (f) items.push(f);
  }

  // 7. Form 35 Hypothecation Termination
  if (taskIds.has('task-form35-action')) {
    const f = findPackFee('fee-hypothecation-termination');
    if (f) items.push(f);
  }

  // 8. Scenario e-Challan Dues (if any)
  if (scenario.blockers.unpaidChallansCount > 0 && taskIds.has('task-pay-echallan')) {
    items.push({
      id: 'fee-scenario-challans',
      label: `Pending Traffic e-Challan (${scenario.move.fromRTO})`,
      amount: scenario.blockers.unpaidChallansAmount,
      tag: 'Scenario',
      sourceIds: ['portal-parivahan'],
      lastChecked: '2026-10-24',
      verified: false,
      note: 'User-specific violation penalty required to unblock NOC issuance.',
    });
  }

  // 9. Estimates from Pack
  for (const f of mergedPack.fees) {
    if (f.tag === 'Estimate' && !items.some((i) => i.id === f.id)) {
      items.push(f);
    }
  }

  // Compute Totals
  let officialTotal = 0;
  let estimateCount = 0;
  let hiddenCount = 0;
  let hasUnverified = false;

  for (const item of items) {
    if (item.tag === 'Official' && item.amount !== null) {
      officialTotal += item.amount;
      if (!item.verified) {
        hasUnverified = true;
      }
    } else if (item.tag === 'Estimate') {
      estimateCount++;
    } else if (item.tag === 'Hidden') {
      hiddenCount++;
    }
  }

  return {
    items,
    officialTotal,
    estimateCount,
    hiddenCount,
    hasUnverified,
  };
}
