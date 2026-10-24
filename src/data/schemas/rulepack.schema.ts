import { z } from 'zod';

export const ruleBasisSchema = z.enum(['statute', 'notification', 'state-portal', 'modelled']);

export const feeTagSchema = z.enum(['Official', 'Estimate', 'Scenario', 'Hidden']);

export const feeItemSchema = z.object({
  id: z.string().min(1, 'Fee ID is required'),
  label: z.string().min(1, 'Fee label is required'),
  amount: z.number().nullable(),
  tag: feeTagSchema,
  sourceIds: z.array(z.string()),
  lastChecked: z.string(),
  verified: z.boolean(),
  note: z.string(),
});

export const licenceStagesConfigSchema = z.object({
  renewalWindowDays: z.number(),
  graceDays: z.number(),
  drivingAllowedDuringGrace: z.boolean(),
  lateFee: z.object({
    base: z.number(),
    perYear: z.number(),
  }),
  testAfterDays: z.number(),
  verified: z.literal(false),
  basis: ruleBasisSchema,
  sourceIds: z.array(z.string()),
  note: z.string(),
});

export const ruleWithMetadataNumberSchema = z.object({
  value: z.number(),
  basis: ruleBasisSchema,
  sourceIds: z.array(z.string()),
  verified: z.literal(false),
  note: z.string(),
});

export const ruleWithMetadataBooleanSchema = z.object({
  value: z.boolean(),
  basis: ruleBasisSchema,
  sourceIds: z.array(z.string()),
  verified: z.literal(false),
  note: z.string(),
});

export const servicesOnlineSchema = z.object({
  licenceRenewal: z.boolean(),
  licenceAddressChange: z.boolean(),
  otherServices: z.array(z.string()),
  basis: ruleBasisSchema,
  sourceIds: z.array(z.string()),
  verified: z.literal(false),
  note: z.string(),
});

export const rulePackSchema = z.object({
  stateCode: z.string().min(2, 'State code must be at least 2 chars (e.g. IN, TS, KA)'),
  version: z.string(),
  isCentral: z.boolean().optional(),
  licenceStages: licenceStagesConfigSchema,
  reRegistrationLimitDays: ruleWithMetadataNumberSchema,
  rcAddressIntimationDays: ruleWithMetadataNumberSchema,
  servicesOnline: servicesOnlineSchema,
  licenceRenewalAtAnyRTO: ruleWithMetadataBooleanSchema,
  nocBlockedBy: z.array(z.string()),
  nocAddressMustMatchRC: z.object({
    value: z.boolean(),
    basis: ruleBasisSchema,
    note: z.string(),
  }),
  bhSeries: z.object({
    exemptFromNOC: z.boolean(),
    exemptFromReRegistration: z.boolean(),
  }),
  fees: z.array(feeItemSchema),
});

export const stateRulePackOverrideSchema = z.object({
  stateCode: z.string().length(2),
  version: z.string(),
  licenceStages: licenceStagesConfigSchema.partial().optional(),
  reRegistrationLimitDays: ruleWithMetadataNumberSchema.partial().optional(),
  rcAddressIntimationDays: ruleWithMetadataNumberSchema.partial().optional(),
  servicesOnline: servicesOnlineSchema.partial().optional(),
  licenceRenewalAtAnyRTO: ruleWithMetadataBooleanSchema.partial().optional(),
  nocBlockedBy: z.array(z.string()).optional(),
  nocAddressMustMatchRC: z
    .object({
      value: z.boolean(),
      basis: ruleBasisSchema,
      note: z.string(),
    })
    .optional(),
  classLetters: z
    .object({
      S: z.string(),
      C: z.string(),
      basis: ruleBasisSchema,
      verified: z.boolean(),
      sourceIds: z.array(z.string()),
      note: z.string(),
    })
    .optional(),
  bhSeries: z
    .object({
      exemptFromNOC: z.boolean(),
      exemptFromReRegistration: z.boolean(),
    })
    .optional(),
  fees: z.array(feeItemSchema).optional(),
});

export type RulePackSchemaType = z.infer<typeof rulePackSchema>;
export type StateRulePackOverrideSchemaType = z.infer<typeof stateRulePackOverrideSchema>;
