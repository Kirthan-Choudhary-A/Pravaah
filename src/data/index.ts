/**
 * Pravaah Data Layer with Runtime Zod Validation
 *
 * Rules:
 * - May only import engine types from @engine.
 * - Every file is validated with Zod at load time.
 * - A bad file throws a clear error naming the file and invalid field.
 */

import { z } from 'zod';
import type { SourceEntry, RulePack, Scenario, FeeItem } from '@engine/model/types';
import { sourcesFileSchema } from './schemas/source.schema';
import { rulePackSchema, stateRulePackOverrideSchema } from './schemas/rulepack.schema';
import { assumptionsFileSchema, type AssumptionsFileSchemaType } from './schemas/assumption.schema';
import { scenariosFileSchema } from './schemas/scenario.schema';

// Static JSON imports
import rawSources from './sources/official_sources.json';
import rawCentralPack from './rulepacks/central.json';
import rawTSPack from './rulepacks/TS.json';
import rawKAPack from './rulepacks/KA.json';
import rawMHPack from './rulepacks/MH.json';
import rawTNPack from './rulepacks/TN.json';
import rawDLPack from './rulepacks/DL.json';
import rawAssumptions from './assumptions/timings.json';
import rawScenarios from './scenarios/scenarios.json';

const STATE_PACKS: Record<string, unknown> = {
  TS: rawTSPack,
  KA: rawKAPack,
  MH: rawMHPack,
  TN: rawTNPack,
  DL: rawDLPack,
};

function formatZodError(fileName: string, err: z.ZodError): Error {
  const details = err.errors.map((e) => `[${e.path.join('.')}]: ${e.message}`).join(', ');
  return new Error(`Data validation failed for "${fileName}": ${details}`);
}

export function loadSources(): readonly SourceEntry[] {
  const result = sourcesFileSchema.safeParse(rawSources);
  if (!result.success) {
    throw formatZodError('sources/official_sources.json', result.error);
  }
  return result.data as readonly SourceEntry[];
}

export function loadCentralRulePack(): RulePack {
  const result = rulePackSchema.safeParse(rawCentralPack);
  if (!result.success) {
    throw formatZodError('rulepacks/central.json', result.error);
  }
  return result.data as RulePack;
}

export function loadStateRulePackOverride(stateCode: string): unknown | null {
  const raw = STATE_PACKS[stateCode.toUpperCase()];
  if (!raw) return null;
  const result = stateRulePackOverrideSchema.safeParse(raw);
  if (!result.success) {
    throw formatZodError(`rulepacks/${stateCode.toUpperCase()}.json`, result.error);
  }
  return result.data;
}

export function loadMergedRulePack(stateCode: string): RulePack {
  const central = loadCentralRulePack();
  const code = stateCode.toUpperCase();
  const rawState = STATE_PACKS[code];

  if (!rawState) {
    // Unknown state -> Degraded mode. Keep central rules but set stateCode and mark unknown.
    return {
      ...central,
      stateCode: code,
      isCentral: false,
    };
  }

  const result = stateRulePackOverrideSchema.safeParse(rawState);
  if (!result.success) {
    throw formatZodError(`rulepacks/${code}.json`, result.error);
  }
  const stateOverride = result.data;

  // Merge central + state override
  const mergedFees: FeeItem[] = [...central.fees];
  if (stateOverride.fees) {
    for (const sFee of stateOverride.fees) {
      const existingIdx = mergedFees.findIndex((f) => f.id === sFee.id);
      if (existingIdx >= 0) {
        mergedFees[existingIdx] = sFee as FeeItem;
      } else {
        mergedFees.push(sFee as FeeItem);
      }
    }
  }

  const mergedPack: RulePack = {
    ...central,
    stateCode: code,
    isCentral: false,
    fees: mergedFees,
    reRegistrationLimitDays: stateOverride.reRegistrationLimitDays
      ? {
          value:
            stateOverride.reRegistrationLimitDays.value ?? central.reRegistrationLimitDays.value,
          basis:
            stateOverride.reRegistrationLimitDays.basis ?? central.reRegistrationLimitDays.basis,
          sourceIds:
            stateOverride.reRegistrationLimitDays.sourceIds ??
            central.reRegistrationLimitDays.sourceIds,
          verified: false,
          note: stateOverride.reRegistrationLimitDays.note ?? central.reRegistrationLimitDays.note,
        }
      : central.reRegistrationLimitDays,
    rcAddressIntimationDays: stateOverride.rcAddressIntimationDays
      ? {
          value:
            stateOverride.rcAddressIntimationDays.value ?? central.rcAddressIntimationDays.value,
          basis:
            stateOverride.rcAddressIntimationDays.basis ?? central.rcAddressIntimationDays.basis,
          sourceIds:
            stateOverride.rcAddressIntimationDays.sourceIds ??
            central.rcAddressIntimationDays.sourceIds,
          verified: false,
          note: stateOverride.rcAddressIntimationDays.note ?? central.rcAddressIntimationDays.note,
        }
      : central.rcAddressIntimationDays,
    servicesOnline: stateOverride.servicesOnline
      ? {
          licenceRenewal:
            stateOverride.servicesOnline.licenceRenewal ?? central.servicesOnline.licenceRenewal,
          licenceAddressChange:
            stateOverride.servicesOnline.licenceAddressChange ??
            central.servicesOnline.licenceAddressChange,
          otherServices:
            stateOverride.servicesOnline.otherServices ?? central.servicesOnline.otherServices,
          basis: stateOverride.servicesOnline.basis ?? central.servicesOnline.basis,
          sourceIds: stateOverride.servicesOnline.sourceIds ?? central.servicesOnline.sourceIds,
          verified: false,
          note: stateOverride.servicesOnline.note ?? central.servicesOnline.note,
        }
      : central.servicesOnline,
    licenceRenewalAtAnyRTO: stateOverride.licenceRenewalAtAnyRTO
      ? {
          value: stateOverride.licenceRenewalAtAnyRTO.value ?? central.licenceRenewalAtAnyRTO.value,
          basis: stateOverride.licenceRenewalAtAnyRTO.basis ?? central.licenceRenewalAtAnyRTO.basis,
          sourceIds:
            stateOverride.licenceRenewalAtAnyRTO.sourceIds ??
            central.licenceRenewalAtAnyRTO.sourceIds,
          verified: false,
          note: stateOverride.licenceRenewalAtAnyRTO.note ?? central.licenceRenewalAtAnyRTO.note,
        }
      : central.licenceRenewalAtAnyRTO,
    nocBlockedBy: stateOverride.nocBlockedBy ?? central.nocBlockedBy,
    nocAddressMustMatchRC: stateOverride.nocAddressMustMatchRC ?? central.nocAddressMustMatchRC,
  };

  return mergedPack;
}

export function loadAssumptions(): AssumptionsFileSchemaType {
  const result = assumptionsFileSchema.safeParse(rawAssumptions);
  if (!result.success) {
    throw formatZodError('assumptions/timings.json', result.error);
  }
  return result.data;
}

export function loadScenarios(): Record<string, Scenario> {
  const result = scenariosFileSchema.safeParse(rawScenarios);
  if (!result.success) {
    throw formatZodError('scenarios/scenarios.json', result.error);
  }
  return result.data as Record<string, Scenario>;
}

export function loadScenario(id: string): Scenario {
  const all = loadScenarios();
  const directKey = all[id.toUpperCase()] || all[id];
  if (directKey) return directKey;

  const found = Object.values(all).find((s) => s.id === id || s.id === id.toLowerCase());
  if (!found) {
    throw new Error(`Scenario "${id}" not found in scenarios registry.`);
  }
  return found;
}
