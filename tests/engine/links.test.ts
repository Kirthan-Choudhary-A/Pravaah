import { describe, it, expect } from 'vitest';
import { planScenario, taskRelations, type Scenario, type RulePack, type Decisions } from '@engine';
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
    expect(relations.needs.length).toBeGreaterThan(0);
    expect(relations.needs.some((n) => n.id === 'task-pay-echallan')).toBe(true);
    expect(relations.needs.some((n) => n.id === 'task-form35-action')).toBe(true);
  });
});
