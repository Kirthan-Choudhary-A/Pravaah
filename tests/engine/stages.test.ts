import { describe, it, expect } from 'vitest';
import { licenceStages, type RulePack } from '@engine';
import { loadCentralRulePack } from '../../src/data/index';

describe('Engine: Licence Stage Derivation & Non-Contradiction Invariant', () => {
  const basePack: RulePack = loadCentralRulePack();

  const testGraceDays = [0, 15, 30, 60, 90];
  const testDrivingAllowed = [true, false];
  const testExpiryDays = [0, 21, 60, 365];

  testGraceDays.forEach((graceDays) => {
    testDrivingAllowed.forEach((drivingAllowed) => {
      testExpiryDays.forEach((expiryDay) => {
        it(`guarantees driving permission and late fee never contradict for graceDays=${graceDays}, allowed=${drivingAllowed}, expiry=${expiryDay}`, () => {
          const pack: RulePack = {
            ...basePack,
            licenceStages: {
              ...basePack.licenceStages,
              graceDays,
              drivingAllowedDuringGrace: drivingAllowed,
            },
          };

          const stages = licenceStages(pack, expiryDay);

          expect(stages).toHaveLength(4);

          const [renewalWindow, gracePeriod, expiredStage, retestStage] = stages;

          // 1. In Renewal Window: driving is always allowed and late fee is 0
          expect(renewalWindow?.drivingAllowed).toBe(true);
          expect(renewalWindow?.lateFeeAmount).toBe(0);

          // 2. In Grace Period: driving status and late fee are completely aligned
          if (drivingAllowed && graceDays > 0) {
            expect(gracePeriod?.drivingAllowed).toBe(true);
            expect(gracePeriod?.lateFeeAmount).toBe(0);
          } else {
            expect(gracePeriod?.drivingAllowed).toBe(false);
            expect(gracePeriod?.lateFeeAmount).toBeGreaterThanOrEqual(0);
          }

          // 3. In Expired Stage: driving is ALWAYS prohibited and late fee is ALWAYS charged
          expect(expiredStage?.drivingAllowed).toBe(false);
          expect(expiredStage?.lateFeeAmount).toBe(pack.licenceStages.lateFee.base);
          expect(expiredStage?.lateFeeAmount).toBeGreaterThan(0);

          // 4. In Re-Test Stage: driving is ALWAYS prohibited and test is ALWAYS required
          expect(retestStage?.drivingAllowed).toBe(false);
          expect(retestStage?.testRequired).toBe(true);
          expect(retestStage?.lateFeeAmount).toBeGreaterThan(expiredStage!.lateFeeAmount);
        });
      });
    });
  });
});
