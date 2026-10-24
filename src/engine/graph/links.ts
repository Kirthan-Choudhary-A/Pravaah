/**
 * Pure Dependency Graph Links and Relation Helpers
 * Models the five legal and operational link types: needs, unlocks, reuses, propagates, invalidates.
 */

import type { Task, Link, PlanResult } from '../model/types';

export function buildLinks(
  tasks: readonly Task[],
  events: readonly { type: string }[] = []
): Link[] {
  const taskIds = new Set(tasks.map((t) => t.id));
  const links: Link[] = [];

  const addLink = (from: string, to: string, type: Link['type'], reason: string) => {
    if (taskIds.has(from) && taskIds.has(to)) {
      links.push({ from, to, type, reason });
    }
  };

  const hasAadhaarEarly = events.some((e) => e.type === 'aadhaarEarly');

  // 1. Challan unlocks NOC
  addLink(
    'task-pay-echallan',
    'task-noc-form28',
    'unlocks',
    'Clearing outstanding traffic violations removes the legal hold on the vehicle, allowing the parent RTO to issue Form 28.'
  );

  // 2. Form 35 resolution unlocks NOC or bank consent
  if (taskIds.has('task-bank-consent-form28')) {
    addLink(
      'task-form35-rejected',
      'task-bank-consent-form28',
      'needs',
      'Bank consent processing begins after formal rejection notice of unilateral Form 35 is received.'
    );
    addLink(
      'task-form35-action',
      'task-bank-consent-form28',
      'needs',
      'Bank consent processing begins once the pending unilateral application is formally withdrawn.'
    );
    addLink(
      'task-bank-consent-form28',
      'task-noc-form28',
      'unlocks',
      'Financier endorsement on Form 28 authorizes inter-state vehicle removal with an active hypothecation.'
    );
  } else {
    addLink(
      'task-form35-action',
      'task-noc-form28',
      'unlocks',
      'Clearing the pending hypothecation record removes the financier lien blocking NOC issuance.'
    );
  }

  // 3. Rental agreement reuses for Form 27 and RC address intimation
  addLink(
    'task-rental-agreement',
    'task-re-registration-form27',
    'reuses',
    'The registered rental agreement provides local residential address verification required for Form 27 inspection.'
  );

  addLink(
    'task-rental-agreement',
    'task-rc-address-intimation',
    'reuses',
    'The registered rental agreement provides the statutory proof of new residence required under Section 49.'
  );

  // 4. NOC needed for Re-registration
  addLink(
    'task-noc-form28',
    'task-re-registration-form27',
    'needs',
    'Form 27 re-registration in the destination state legally requires a valid Form 28 NOC from the parent RTO.'
  );

  // 5. NOC ordering with Aadhaar (or invalidates link if early)
  if (hasAadhaarEarly) {
    addLink(
      'task-aadhaar-update',
      'task-noc-form28',
      'invalidates',
      'modelled rule (assumed): Updating Aadhaar before NOC causes parent RTO verification to fail due to address mismatch against RC records.'
    );
  } else {
    addLink(
      'task-noc-form28',
      'task-aadhaar-update',
      'needs',
      'Aadhaar update is sequenced after NOC issuance so the applicant address continues to match the parent RC during RTO clearance.'
    );
  }

  // 6. Loan closure on new RC needs re-registration
  addLink(
    'task-re-registration-form27',
    'task-close-loan-new-rc',
    'needs',
    'The new state registration certificate must be assigned before filing hypothecation termination in the new jurisdiction.'
  );

  // 7. Aadhaar propagates to licence address change
  addLink(
    'task-aadhaar-update',
    'task-licence-address-change',
    'propagates',
    'The updated Aadhaar becomes the proof for the online licence address change.'
  );

  // 8. Licence renewal sequences before licence address change
  addLink(
    'task-licence-renewal',
    'task-licence-address-change',
    'needs',
    'Licence renewal must be completed before applying for address modification to prevent duplicate card re-issuance conflicts.'
  );

  return links;
}

export interface TaskRelations {
  readonly taskId: string;
  readonly taskName: string;
  readonly needs: readonly {
    readonly id: string;
    readonly name: string;
    readonly reason: string;
  }[];
  readonly unlocks: readonly {
    readonly id: string;
    readonly name: string;
    readonly reason: string;
  }[];
  readonly reuses: readonly {
    readonly id: string;
    readonly name: string;
    readonly reason: string;
  }[];
  readonly propagatesTo: readonly {
    readonly id: string;
    readonly name: string;
    readonly reason: string;
  }[];
  readonly invalidates: readonly {
    readonly id: string;
    readonly name: string;
    readonly reason: string;
  }[];
}

export function taskRelations(plan: PlanResult, taskId: string): TaskRelations {
  const currentTask = plan.tasks.find((t) => t.id === taskId);
  if (!currentTask) {
    throw new Error(`Task "${taskId}" not found in plan result.`);
  }

  const findTaskName = (id: string) => plan.tasks.find((t) => t.id === id)?.name ?? id;

  const needs: { id: string; name: string; reason: string }[] = [];
  const unlocks: { id: string; name: string; reason: string }[] = [];
  const reuses: { id: string; name: string; reason: string }[] = [];
  const propagatesTo: { id: string; name: string; reason: string }[] = [];
  const invalidates: { id: string; name: string; reason: string }[] = [];

  for (const l of plan.links) {
    if (l.to === taskId) {
      if (l.type === 'needs') {
        needs.push({ id: l.from, name: findTaskName(l.from), reason: l.reason });
      } else if (l.type === 'unlocks') {
        needs.push({ id: l.from, name: findTaskName(l.from), reason: l.reason });
      } else if (l.type === 'reuses') {
        reuses.push({ id: l.from, name: findTaskName(l.from), reason: l.reason });
      }
    }

    if (l.from === taskId) {
      if (l.type === 'unlocks') {
        unlocks.push({ id: l.to, name: findTaskName(l.to), reason: l.reason });
      } else if (l.type === 'propagates') {
        propagatesTo.push({ id: l.to, name: findTaskName(l.to), reason: l.reason });
      } else if (l.type === 'invalidates') {
        invalidates.push({ id: l.to, name: findTaskName(l.to), reason: l.reason });
      }
    }
  }

  return {
    taskId,
    taskName: currentTask.name,
    needs,
    unlocks,
    reuses,
    propagatesTo,
    invalidates,
  };
}
