/**
 * Pure Dependency Graph Links and Relation Helpers
 * Models the five legal and operational link types: needs, unlocks, reuses, propagates, invalidates.
 * Every link carries a basis and sources; none is verified until its official source has been read.
 */

import type { Task, Link, LinkType, PlanResult, RuleBasis } from '../model/types';

/** Link types that enforce execution order. `invalidates` is a consequence, not an ordering. */
export const ORDERING_LINK_TYPES: ReadonlySet<LinkType> = new Set<LinkType>([
  'needs',
  'unlocks',
  'reuses',
  'propagates',
]);

interface LinkMeta {
  readonly basis: RuleBasis;
  readonly sourceIds: readonly string[];
  readonly warning?: string;
}

export function buildLinks(
  tasks: readonly Task[],
  events: readonly { type: string }[] = []
): Link[] {
  const taskIds = new Set(tasks.map((t) => t.id));
  const links: Link[] = [];

  const addLink = (from: string, to: string, type: LinkType, reason: string, meta: LinkMeta) => {
    if (taskIds.has(from) && taskIds.has(to)) {
      links.push({
        from,
        to,
        type,
        reason,
        basis: meta.basis,
        sourceIds: meta.sourceIds,
        verified: false,
        ...(meta.warning ? { warning: meta.warning } : {}),
      });
    }
  };

  const hasAadhaarEarly = events.some((e) => e.type === 'aadhaarEarly');

  // 1. Challan unlocks NOC
  addLink(
    'task-pay-echallan',
    'task-noc-form28',
    'unlocks',
    'Modelled rule (assumed): unpaid traffic dues keep a hold on the vehicle record, so the parent RTO will not issue Form 28 until they are cleared.',
    { basis: 'modelled', sourceIds: ['portal-vahan'] }
  );

  // 2. Form 35 resolution unlocks NOC or bank consent
  if (taskIds.has('task-bank-consent-form28')) {
    addLink(
      'task-form35-rejected',
      'task-bank-consent-form28',
      'needs',
      'Bank consent processing begins after formal rejection notice of unilateral Form 35 is received.',
      { basis: 'modelled', sourceIds: ['portal-vahan'] }
    );
    addLink(
      'task-form35-action',
      'task-bank-consent-form28',
      'needs',
      'Bank consent processing begins once the pending unilateral application is formally withdrawn.',
      { basis: 'modelled', sourceIds: ['portal-vahan'] }
    );
    addLink(
      'task-bank-consent-form28',
      'task-noc-form28',
      'unlocks',
      'With the loan still open, the financier must consent on Form 28 before the vehicle can move to another state.',
      { basis: 'statute', sourceIds: ['mva-1988-s48'] }
    );
  } else {
    addLink(
      'task-form35-action',
      'task-noc-form28',
      'unlocks',
      'Modelled rule (assumed): an open or pending hypothecation record blocks NOC issuance until it is cleared.',
      { basis: 'modelled', sourceIds: ['portal-vahan'] }
    );
  }

  // 3. Rental agreement reuses for Form 27 and RC address intimation
  addLink(
    'task-rental-agreement',
    'task-re-registration-form27',
    'reuses',
    'The registered rental agreement is reused as proof of the new local address for the Form 27 application.',
    { basis: 'modelled', sourceIds: ['mva-1988-s47'] }
  );

  addLink(
    'task-rental-agreement',
    'task-rc-address-intimation',
    'reuses',
    'The registered rental agreement is reused as proof of the new residence when intimating the change of address (Section 49 sets a 30-day limit).',
    { basis: 'modelled', sourceIds: ['mva-1988-s49'] }
  );

  // 4. NOC needed for Re-registration
  addLink(
    'task-noc-form28',
    'task-re-registration-form27',
    'needs',
    'Re-registration in the destination state needs the Form 28 NOC from the parent RTO (Sections 47 and 48).',
    { basis: 'statute', sourceIds: ['mva-1988-s47', 'mva-1988-s48'] }
  );

  // 5. NOC ordering with Aadhaar (or invalidates link if early)
  if (hasAadhaarEarly) {
    addLink(
      'task-aadhaar-update',
      'task-noc-form28',
      'invalidates',
      'modelled rule (assumed): Updating Aadhaar before NOC causes parent RTO verification to fail due to address mismatch against RC records.',
      { basis: 'modelled', sourceIds: [] }
    );
  } else {
    addLink(
      'task-noc-form28',
      'task-aadhaar-update',
      'needs',
      'Aadhaar update is sequenced after NOC issuance so the applicant address continues to match the parent RC during RTO clearance.',
      {
        basis: 'modelled',
        sourceIds: [],
        warning:
          'Updating Aadhaar before the NOC is issued invalidates the NOC (modelled rule, assumed): the old RTO checks the address against the RC and the NOC must be redone.',
      }
    );
  }

  // 6. Loan closure on new RC needs re-registration
  addLink(
    'task-re-registration-form27',
    'task-close-loan-new-rc',
    'needs',
    'The new state registration certificate must be assigned before filing hypothecation termination in the new jurisdiction.',
    { basis: 'modelled', sourceIds: ['portal-vahan'] }
  );

  // 7. Aadhaar propagates to licence address change
  addLink(
    'task-aadhaar-update',
    'task-licence-address-change',
    'propagates',
    'The updated Aadhaar becomes the proof for the online licence address change.',
    { basis: 'notification', sourceIds: ['portal-sarathi'] }
  );

  // 8. Licence renewal sequences before licence address change
  addLink(
    'task-licence-renewal',
    'task-licence-address-change',
    'needs',
    'Modelled sequencing (assumed): renew on the existing address first, then change the address. No source in the registry requires this order.',
    { basis: 'modelled', sourceIds: [] }
  );

  return links;
}

/**
 * Returns the first dependency cycle among ordering links as a list of task ids
 * (first id repeated at the end), or null when the graph is acyclic.
 */
export function findCycle(tasks: readonly Task[], links: readonly Link[]): string[] | null {
  const next = new Map<string, string[]>(tasks.map((t) => [t.id, []]));
  for (const l of links) {
    if (ORDERING_LINK_TYPES.has(l.type)) next.get(l.from)?.push(l.to);
  }

  const state = new Map<string, 'active' | 'done'>();
  const path: string[] = [];

  const visit = (id: string): string[] | null => {
    state.set(id, 'active');
    path.push(id);
    for (const n of next.get(id) ?? []) {
      if (state.get(n) === 'active') return [...path.slice(path.indexOf(n)), n];
      if (!state.has(n)) {
        const found = visit(n);
        if (found) return found;
      }
    }
    path.pop();
    state.set(id, 'done');
    return null;
  };

  for (const t of tasks) {
    if (!state.has(t.id)) {
      const found = visit(t.id);
      if (found) return found;
    }
  }
  return null;
}

export function assertAcyclic(tasks: readonly Task[], links: readonly Link[]): void {
  const cycle = findCycle(tasks, links);
  if (cycle) throw new Error(`Dependency cycle: ${cycle.join(' -> ')}`);
}

export interface RelationItem {
  readonly id: string;
  readonly name: string;
  readonly reason: string;
  readonly basis: RuleBasis;
  readonly verified: boolean;
  readonly warning?: string;
}

/** Every link type, seen from both ends of the link. */
export interface TaskRelations {
  readonly taskId: string;
  readonly taskName: string;
  /** Tasks this task needs first. */
  readonly needs: readonly RelationItem[];
  /** Tasks that need this task first. */
  readonly neededBy: readonly RelationItem[];
  /** Tasks whose completion removes a lock on this task. */
  readonly unlockedBy: readonly RelationItem[];
  /** Tasks this task unlocks. */
  readonly unlocks: readonly RelationItem[];
  /** Tasks whose document this task reuses. */
  readonly reuses: readonly RelationItem[];
  /** Tasks that reuse this task's document. */
  readonly reusedBy: readonly RelationItem[];
  /** Tasks whose data flows into this task. */
  readonly propagatesFrom: readonly RelationItem[];
  /** Tasks this task's data flows into. */
  readonly propagatesTo: readonly RelationItem[];
  /** Tasks that, done too early, break this task. */
  readonly invalidatedBy: readonly RelationItem[];
  /** Tasks this task breaks if done too early. */
  readonly invalidates: readonly RelationItem[];
}

export function taskRelations(plan: PlanResult, taskId: string): TaskRelations {
  const currentTask = plan.tasks.find((t) => t.id === taskId);
  if (!currentTask) {
    throw new Error(`Task "${taskId}" not found in plan result.`);
  }

  const findTaskName = (id: string) => plan.tasks.find((t) => t.id === id)?.name ?? id;

  const toItem = (l: Link, otherId: string): RelationItem => ({
    id: otherId,
    name: findTaskName(otherId),
    reason: l.reason,
    basis: l.basis,
    verified: l.verified,
    ...(l.warning ? { warning: l.warning } : {}),
  });

  const incoming = (type: LinkType): RelationItem[] =>
    plan.links.filter((l) => l.to === taskId && l.type === type).map((l) => toItem(l, l.from));
  const outgoing = (type: LinkType): RelationItem[] =>
    plan.links.filter((l) => l.from === taskId && l.type === type).map((l) => toItem(l, l.to));

  return {
    taskId,
    taskName: currentTask.name,
    needs: incoming('needs'),
    neededBy: outgoing('needs'),
    unlockedBy: incoming('unlocks'),
    unlocks: outgoing('unlocks'),
    reuses: incoming('reuses'),
    reusedBy: outgoing('reuses'),
    propagatesFrom: incoming('propagates'),
    propagatesTo: outgoing('propagates'),
    invalidatedBy: incoming('invalidates'),
    invalidates: outgoing('invalidates'),
  };
}
