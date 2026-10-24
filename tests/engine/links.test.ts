import { describe, it, expect } from 'vitest';
import {
  assertAcyclic,
  findCycle,
  planScenario,
  taskRelations,
  type Link,
  type Scenario,
  type RulePack,
  type Decisions,
  type Task,
} from '@engine';
import { loadScenario, loadMergedRulePack } from '../../src/data/index';

describe('Engine: Dependency Links and Relations', () => {
  const scenarioA: Scenario = loadScenario('A');
  const packKA: RulePack = loadMergedRulePack('KA');
  const decisions: Decisions = { form35: 'resolve', licenceRoute: 'online' };

  it('contains the exact statutory propagation wording for Aadhaar to licence address change', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions,
    });

    const propLink = plan.links.find(
      (l) => l.from === 'task-aadhaar-update' && l.to === 'task-licence-address-change'
    )!;

    expect(propLink).toBeDefined();
    expect(propLink.type).toBe('propagates');
    expect(propLink.reason).toBe(
      'The updated Aadhaar becomes the proof for the online licence address change.'
    );
  });

  it('includes invalidates link when aadhaarEarly event is active', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions,
      events: [{ type: 'aadhaarEarly', day: 0 }],
    });

    const invLink = plan.links.find((l) => l.type === 'invalidates')!;
    expect(invLink).toBeDefined();
    expect(invLink.from).toBe('task-aadhaar-update');
    expect(invLink.to).toBe('task-noc-form28');
    expect(invLink.reason).toContain('modelled rule (assumed)');
  });

  it('taskRelations returns what a task needs, what it unlocks, and why', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions,
    });

    const relations = taskRelations(plan, 'task-noc-form28');
    expect(relations.taskId).toBe('task-noc-form28');
    expect(relations.unlockedBy.length).toBeGreaterThan(0);
    expect(relations.unlockedBy.some((n) => n.id === 'task-pay-echallan')).toBe(true);
    expect(relations.unlockedBy.some((n) => n.id === 'task-form35-action')).toBe(true);
    expect(relations.needs).toEqual([]);
  });

  it('gives every link a basis and sources, and none is marked verified', () => {
    const plan = planScenario({ scenario: scenarioA, mergedPack: packKA, decisions });
    expect(plan.links.length).toBeGreaterThan(0);
    for (const l of plan.links) {
      expect(l.verified).toBe(false);
      if (l.basis !== 'modelled') expect(l.sourceIds.length).toBeGreaterThan(0);
    }
  });

  it('warns on the NOC to Aadhaar ordering even when Aadhaar is not updated early', () => {
    const plan = planScenario({ scenario: scenarioA, mergedPack: packKA, decisions });
    const order = plan.links.find(
      (l) => l.from === 'task-noc-form28' && l.to === 'task-aadhaar-update'
    )!;
    expect(order.type).toBe('needs');
    expect(order.warning).toContain('invalidates the NOC');

    const noc = taskRelations(plan, 'task-noc-form28');
    expect(noc.neededBy.find((n) => n.id === 'task-aadhaar-update')?.warning).toBeDefined();
  });

  it('shows invalidation from both ends when Aadhaar is updated early', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions,
      events: [{ type: 'aadhaarEarly', day: 0 }],
    });
    expect(
      taskRelations(plan, 'task-aadhaar-update').invalidates.some((n) => n.id === 'task-noc-form28')
    ).toBe(true);
    expect(
      taskRelations(plan, 'task-noc-form28').invalidatedBy.some(
        (n) => n.id === 'task-aadhaar-update'
      )
    ).toBe(true);
  });

  it('shows reuses and propagates from both ends', () => {
    const plan = planScenario({ scenario: scenarioA, mergedPack: packKA, decisions });
    expect(
      taskRelations(plan, 'task-rental-agreement').reusedBy.some(
        (n) => n.id === 'task-re-registration-form27'
      )
    ).toBe(true);
    expect(
      taskRelations(plan, 'task-re-registration-form27').reuses.some(
        (n) => n.id === 'task-rental-agreement'
      )
    ).toBe(true);
    expect(
      taskRelations(plan, 'task-licence-address-change').propagatesFrom.some(
        (n) => n.id === 'task-aadhaar-update'
      )
    ).toBe(true);
  });
});

describe('Engine: dependency cycle validation', () => {
  const task = (id: string) => ({ id }) as Task;
  const link = (from: string, to: string, type: Link['type'] = 'needs'): Link => ({
    from,
    to,
    type,
    reason: 'test',
    basis: 'modelled',
    sourceIds: [],
    verified: false,
  });

  it('returns null for an acyclic graph', () => {
    const tasks = [task('a'), task('b'), task('c')];
    expect(findCycle(tasks, [link('a', 'b'), link('b', 'c'), link('a', 'c')])).toBeNull();
  });

  it('finds a cycle across ordering link types and names it', () => {
    const tasks = [task('a'), task('b'), task('c')];
    const cycle = findCycle(tasks, [link('a', 'b'), link('b', 'c', 'unlocks'), link('c', 'a')]);
    expect(cycle).toEqual(['a', 'b', 'c', 'a']);
  });

  it('ignores invalidates links, which are consequences and not ordering', () => {
    const tasks = [task('a'), task('b')];
    expect(findCycle(tasks, [link('a', 'b'), link('b', 'a', 'invalidates')])).toBeNull();
  });

  it('throws with the cycle path from assertAcyclic', () => {
    const tasks = [task('a'), task('b')];
    expect(() => assertAcyclic(tasks, [link('a', 'b'), link('b', 'a')])).toThrow(
      'Dependency cycle: a -> b -> a'
    );
  });

  it('plans scenario A with and without the early Aadhaar event without a cycle', () => {
    const scenario = loadScenario('A');
    const pack = loadMergedRulePack('KA');
    const d: Decisions = { form35: 'resolve', licenceRoute: 'online' };
    expect(() => planScenario({ scenario, mergedPack: pack, decisions: d })).not.toThrow();
    expect(() =>
      planScenario({
        scenario,
        mergedPack: pack,
        decisions: d,
        events: [{ type: 'aadhaarEarly', day: 0 }],
      })
    ).not.toThrow();
  });
});
