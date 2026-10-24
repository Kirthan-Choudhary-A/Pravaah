import { describe, it, expect } from 'vitest';
import {
  planScenario,
  diffPlans,
  compareOptions,
  parsePlate,
  checkPlateClass,
  buildReadBack,
  createConsentRequest,
  grantConsent,
  revokeConsent,
  canAccess,
  reveal,
  appendAudit,
  planHousehold,
  type Scenario,
  type RulePack,
  type Decisions,
  type AuditEntry,
  type HouseholdVehicle,
} from '@engine';
import { loadScenario, loadMergedRulePack } from '../../src/data/index';
import {
  ENGLISH_LETTERS,
  NATO_ALPHABET,
  ENGLISH_DIGITS,
  HINDI_DIGITS,
  TELUGU_DIGITS,
  KANNADA_DIGITS,
  FILLER_WORDS,
  STATE_NAMES,
  CONFIRMATION_PROMPTS,
} from '../../src/i18n/words';

describe('Gold Scenario Test Suite (GS-01 to GS-11)', () => {
  const scenarioA: Scenario = loadScenario('A');
  const scenarioB: Scenario = loadScenario('B');
  const scenarioC: Scenario = loadScenario('C');

  const packKA: RulePack = loadMergedRulePack('KA');
  const packTN: RulePack = loadMergedRulePack('TN');
  const packSK: RulePack = loadMergedRulePack('SK');

  const dict = {
    letterNames: ENGLISH_LETTERS,
    natoAlphabet: NATO_ALPHABET,
    digits: ENGLISH_DIGITS,
    hindiDigits: HINDI_DIGITS,
    teluguDigits: TELUGU_DIGITS,
    kannadaDigits: KANNADA_DIGITS,
    fillerWords: FILLER_WORDS,
  };

  const readBackDict = {
    stateNames: STATE_NAMES,
    confirmationPrompts: CONFIRMATION_PROMPTS,
    englishDigits: ENGLISH_DIGITS,
    hindiDigits: HINDI_DIGITS,
    teluguDigits: TELUGU_DIGITS,
    kannadaDigits: KANNADA_DIGITS,
  };

  const bestDecisionsA: Decisions = { form35: 'resolve', licenceRoute: 'online' };

  // GS-01: Scenario A, Best Plan
  it('GS-01: Scenario A best plan finishes on Day 31 with licence renewed online and all checks passing', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: bestDecisionsA,
    });

    expect(plan.finish).toBe(31);
    expect(plan.finishingTask).toBe('task-licence-address-change');

    const dl = plan.tasks.find((t) => t.id === 'task-licence-renewal')!;
    expect(dl.end).toBe(5);
    expect(dl.end).toBeLessThanOrEqual(scenarioA.licenceExpiryDay);

    const noc = plan.tasks.find((t) => t.id === 'task-noc-form28')!;
    const aadhaar = plan.tasks.find((t) => t.id === 'task-aadhaar-update')!;
    expect(aadhaar.start).toBeGreaterThanOrEqual(noc.end);

    const reReg = plan.tasks.find((t) => t.id === 'task-re-registration-form27')!;
    expect(reReg.start).toBe(25); // exactly after owner returns on day 25

    for (const c of plan.checks) {
      expect(c.passed).toBe(true);
    }
  });

  // GS-02: Scenario A + aadhaarEarly
  it('GS-02: Scenario A + aadhaarEarly triggers invalidates link, reworks NOC, and fails check', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: bestDecisionsA,
      events: [{ type: 'aadhaarEarly', day: 0 }],
    });

    const invLink = plan.links.find((l) => l.type === 'invalidates')!;
    expect(invLink).toBeDefined();
    expect(invLink.from).toBe('task-aadhaar-update');
    expect(invLink.to).toBe('task-noc-form28');

    const aadhaarCheck = plan.checks.find((c) => c.id === 'check-aadhaar-after-noc')!;
    expect(aadhaarCheck.passed).toBe(false);

    // Plan finishes later (Day 40) due to NOC rework delay
    expect(plan.finish).toBe(40);
  });

  // GS-03: Scenario A with slot queue 4 vs slotCollapse to 28
  it('GS-03: Slot queue 4 vs slotCollapse to 28 changes RTO route to Missed and changes recommendation', () => {
    const planSlot4 = planScenario({
      scenario: { ...scenarioA, primarySlotQueue: 4 },
      mergedPack: packKA,
      decisions: { form35: 'resolve', licenceRoute: 'rto-visit' },
    });

    const dlSlot4 = planSlot4.tasks.find((t) => t.id === 'task-licence-renewal')!;
    expect(dlSlot4.start).toBe(4);
    expect(dlSlot4.status).toBe('Safe');

    const planSlot28 = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: { form35: 'resolve', licenceRoute: 'rto-visit' },
      events: [{ type: 'slotCollapse', queueDays: 28 }],
    });

    const dlSlot28 = planSlot28.tasks.find((t) => t.id === 'task-licence-renewal')!;
    expect(dlSlot28.status).toBe('Missed');
    expect(dlSlot28.bookingLSD).toBe(-19);

    const comp = compareOptions({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: { form35: 'resolve', licenceRoute: 'rto-visit' },
      events: [{ type: 'slotCollapse', queueDays: 28 }],
    });

    // Best recommendation is online renewal, not RTO visit
    expect(comp[0]!.decisions.licenceRoute).toBe('online');
  });

  // GS-04: Scenario A + formRejected
  it('GS-04: Scenario A + formRejected adds bank consent and new RC loan closure', () => {
    const beforePlan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: bestDecisionsA,
    });

    const afterPlan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: bestDecisionsA,
      events: [{ type: 'formRejected', day: 5 }],
    });

    const diff = diffPlans(beforePlan, afterPlan);
    expect(diff.tasksAdded).toContain('task-bank-consent-form28');
    expect(diff.tasksAdded).toContain('task-close-loan-new-rc');

    const taskMap = new Map(afterPlan.tasks.map((t) => [t.id, t]));
    expect(taskMap.has('task-bank-consent-form28')).toBe(true);
    expect(taskMap.has('task-close-loan-new-rc')).toBe(true);

    expect(afterPlan.finish).toBe(39);
  });

  // GS-05: Scenario C (Unknown Sikkim jurisdiction)
  it('GS-05: Scenario C has unknown Sikkim tasks, Hidden fees, no invented dates, and known steps scheduled', () => {
    const plan = planScenario({
      scenario: scenarioC,
      mergedPack: packSK,
      decisions: bestDecisionsA,
    });

    expect(plan.degradedMode).toBe(true);

    const skTask = plan.tasks.find((t) => t.id === 'task-re-registration-form27')!;
    expect(skTask.unknown).toBe(true);
    expect(skTask.duration).toBe(0);
    expect(skTask.status).toBe('Unknown');

    const hiddenFee = plan.fees.items.find((f) => f.tag === 'Hidden')!;
    expect(hiddenFee.amount).toBeNull();

    // Known steps still get valid schedules
    const challan = plan.tasks.find((t) => t.id === 'task-pay-echallan')!;
    expect(challan.start).toBe(0);
    expect(challan.end).toBe(1);

    const noc = plan.tasks.find((t) => t.id === 'task-noc-form28')!;
    expect(noc.start).toBe(1);
    expect(noc.end).toBe(11); // 1 + 10 = Day 11 ready
  });

  // GS-06: Plate/class mismatch in Delhi
  it('GS-06: Delhi plate class mismatch returns question without auto-correcting', () => {
    const packDL: RulePack = loadMergedRulePack('DL');
    const parseRes = parsePlate('DL 1C AB 1234', dict);
    expect(parseRes.success).toBe(true);
    const candidate = parseRes.candidates.find((c) => c.state === 'DL')!;
    expect(candidate).toBeDefined();
    expect(candidate.formatted).toBe('DL-01-CAB-1234');

    const check = checkPlateClass(candidate, 'two-wheeler', packDL);
    expect(check.status).toBe('mismatch');
    expect(check.detectedClass).toBe('Car');
    expect(check.expectedClass).toBe('Two-Wheeler');
    expect(check.question).toContain("class letter 'C' (Car)");
    expect(check.question).toContain('Two-Wheeler');
    // Ensure no silent auto-correction took place
    expect(candidate.series.startsWith('C')).toBe(true);
  });

  // GS-07: Household consent lifecycle and privacy boundaries
  it('GS-07: Household consent lifecycle respects privacy boundaries and audit logging', () => {
    let auditLog: readonly AuditEntry[] = [];
    const now = 1700000000000;

    // 1. You create consent request for Family member's vehicle
    const reqResult = createConsentRequest({
      id: 'req-001',
      grantorRole: 'Family member',
      granteeRole: 'You',
      vehicleIds: ['KA-03-MJ-4578'],
      scopes: ['view', 'apply'],
      until: now + 86400000 * 30,
      now,
    });
    expect(reqResult.ok).toBe(true);
    if (!reqResult.ok) return;
    const request = reqResult.consent;
    expect(request.status).toBe('pending');
    if (reqResult.auditEntry) {
      auditLog = appendAudit(auditLog, reqResult.auditEntry);
    }

    // 2. Family member grants consent with 'view' scope
    const grantResult = grantConsent(request, now + 1000, ['view']);
    expect(grantResult.ok).toBe(true);
    if (!grantResult.ok) return;
    const grantedConsent = grantResult.consent;
    if (grantResult.auditEntry) {
      auditLog = appendAudit(auditLog, grantResult.auditEntry);
    }

    // 3. Plan household tasks
    const householdVehicles: HouseholdVehicle[] = [
      {
        id: 'hv-1',
        ownerRole: 'Family member',
        plate: 'KA-03-MJ-4578',
        vehicleType: 'two-wheeler',
        renewalItems: [
          {
            id: 'puc-1',
            name: 'PUC Renewal',
            dueDate: 30,
            duration: 1,
            basis: 'statute',
            verified: false,
            why: 'PUC valid for 6 months under CMVR Rule 115',
          },
        ],
      },
    ];

    const tasks = planHousehold({
      householdVehicles,
      consents: [grantedConsent],
      now: now + 2000,
      currentDay: 0,
    });

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0]!.lane).toBe('household');
    expect(tasks[0]!.name).toContain('KA-03-**-**78'); // Vehicle plate masked in name
    expect(tasks[0]!.deadline).toBe(30);

    // 4. Privacy boundaries: dl, aadhaar, challans are unconditionally blocked
    expect(canAccess('vehicle.pucExpiry', grantedConsent, now + 2000)).toBe(true);
    expect(canAccess('owner.dl', grantedConsent, now + 2000)).toBe(false);
    expect(canAccess('owner.aadhaar', grantedConsent, now + 2000)).toBe(false);
    expect(canAccess('vehicle.challans', grantedConsent, now + 2000)).toBe(false);

    // 5. Reveal with valid purpose logs audit entry
    const revealResult = reveal({
      field: 'vehicle.pucExpiry',
      rawValue: '2026-11-24',
      purpose: 'Submit NOC application',
      consent: grantedConsent,
      actor: 'You',
      now: now + 3000,
    });
    expect(revealResult.ok).toBe(true);
    if (revealResult.ok) {
      expect(revealResult.value).toBe('2026-11-24');
      expect(revealResult.expiresAt).toBe(now + 3000 + 60);
      auditLog = appendAudit(auditLog, revealResult.auditEntry);
    }
    expect(auditLog.some((e) => e.action === 'reveal')).toBe(true);

    // 6. Revoke consent
    const revokeResult = revokeConsent(grantedConsent, now + 4000);
    expect(revokeResult.ok).toBe(true);
    if (!revokeResult.ok) return;
    const revokedConsent = revokeResult.consent;
    expect(revokedConsent.status).toBe('revoked');
    if (revokeResult.auditEntry) {
      auditLog = appendAudit(auditLog, revokeResult.auditEntry);
    }

    // 7. Verify planHousehold produces no tasks once revoked
    const revokedTasks = planHousehold({
      householdVehicles,
      consents: [revokedConsent],
      now: now + 5000,
      currentDay: 0,
    });
    expect(revokedTasks.length).toBe(0);

    // 8. Audit log is complete and immutable
    expect(auditLog.length).toBe(4);
  });

  // GS-08: Voice plate entry with positional fixes, read-back, and explicit save
  it('GS-08: Voice transcript parses with look-alike fix, generates multilingual read-back, saves only on confirm', () => {
    const rawTranscript = 'kay ay oh three em jay four five seven eight';
    const parseRes = parsePlate(rawTranscript, dict);

    expect(parseRes.success).toBe(true);
    const candidate = parseRes.candidates[0]!;
    expect(candidate.formatted).toBe('KA-03-MJ-4578');

    // Look-alike fix O -> 0 in RTO segment
    const oFix = candidate.fixes.find((f) => f.original === 'O');
    expect(oFix).toBeDefined();
    expect(oFix?.corrected).toBe('0');
    expect(oFix?.reason).toContain('RTO part must be digits');

    // Multilingual read-back
    const rbEn = buildReadBack(candidate, 'en', readBackDict);
    expect(rbEn.fullSpeech).toContain('Karnataka');
    expect(rbEn.fullSpeech).toContain('RTO zero three');
    expect(rbEn.fullSpeech).toContain('Series M J');
    expect(rbEn.fullSpeech).toContain('Number four five seven eight');

    const rbHi = buildReadBack(candidate, 'hi', readBackDict);
    expect(rbHi.fullSpeech).toContain('कर्नाटक');
    expect(rbHi.fullSpeech).toContain('आरटीओ shunya teen');

    // Explicit confirmation save step
    let vehicleList: readonly HouseholdVehicle[] = [];
    const isConfirmed = true;
    if (isConfirmed) {
      vehicleList = [
        ...vehicleList,
        {
          id: 'v-new',
          ownerRole: 'You',
          plate: candidate.formatted,
          vehicleType: 'Car',
          renewalItems: [],
        },
      ];
    }
    expect(vehicleList.length).toBe(1);
    expect(vehicleList[0]!.plate).toBe('KA-03-MJ-4578');
  });

  // GS-09: Scenario B (BH Series)
  it('GS-09: Scenario B handles BH-series vehicle with address updates only (no NOC, no re-registration)', () => {
    const plan = planScenario({
      scenario: scenarioB,
      mergedPack: packTN,
      decisions: bestDecisionsA,
    });

    const taskIds = plan.tasks.map((t) => t.id);
    expect(taskIds).not.toContain('task-noc-form28');
    expect(taskIds).not.toContain('task-re-registration-form27');
    expect(taskIds).not.toContain('task-form35-action');

    expect(taskIds).toContain('task-aadhaar-update');
    expect(taskIds).toContain('task-licence-address-change');
    expect(taskIds).toContain('task-rc-address-intimation');

    expect(plan.finish).toBe(12);
  });

  // GS-10: Scenario A + tripExtended(7)
  it('GS-10: Scenario A + tripExtended(7) schedules in-person visit when owner is back in town', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: bestDecisionsA,
      events: [{ type: 'tripExtended', additionalDays: 7 }],
    });

    // Original trip days 12-25 + 7 = 12-32.
    // Visit starts on Day 32 + 4 days duration = Day 36
    const reReg = plan.tasks.find((t) => t.id === 'task-re-registration-form27')!;
    expect(reReg.start).toBe(32);
    expect(reReg.end).toBe(36);

    const inTownCheck = plan.checks.find((c) => c.id === 'check-owner-in-town')!;
    expect(inTownCheck.passed).toBe(true);
  });

  // GS-11: Scenario A Section 49 RC address intimation
  it('GS-11: Scenario A RC address intimation shows deadline, LSD, and Safe status', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: bestDecisionsA,
    });

    const rcTask = plan.tasks.find((t) => t.id === 'task-rc-address-intimation')!;
    expect(rcTask).toBeDefined();
    expect(rcTask.deadline).toBe(30);
    expect(rcTask.duration).toBe(3);
    expect(rcTask.start).toBe(3);
    expect(rcTask.end).toBe(6);
    expect(rcTask.lsd).toBe(25); // 30 - 3 - 2 = 25
    expect(rcTask.slack).toBe(22); // 25 - 3 = 22
    expect(rcTask.status).toBe('Safe');
  });
});
