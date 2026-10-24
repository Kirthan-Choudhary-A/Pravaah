import { z } from 'zod';

export const assumptionEntrySchema = z.object({
  expected: z.number(),
  slow: z.number().optional(),
  label: z.literal('assumed'),
  note: z.string(),
});

export const assumptionsFileSchema = z.object({
  form35: z.object({
    wait: assumptionEntrySchema,
    resolve: assumptionEntrySchema,
    rejected: assumptionEntrySchema,
    withdraw: assumptionEntrySchema,
  }),
  licence: z.object({
    onlineRenewal: assumptionEntrySchema,
    rtoRenewal: assumptionEntrySchema,
    onlineAddressChange: assumptionEntrySchema,
  }),
  vehicle: z.object({
    reRegistrationProcessing: assumptionEntrySchema,
    aadhaarUpdate: assumptionEntrySchema,
    reFilingLoanClosureOnNewRC: assumptionEntrySchema,
    payEChallan: assumptionEntrySchema,
    registeredRentalAgreement: assumptionEntrySchema,
    rcAddressIntimation: assumptionEntrySchema,
    nocReworkInvalidated: assumptionEntrySchema,
    nocProcessing: assumptionEntrySchema,
    bankConsentForm28: assumptionEntrySchema,
  }),
  buffers: z.object({
    onlineBufferDays: z.number(),
    betaMinDays: z.number(),
    betaQueueMultiplier: z.number(),
  }),
});

export type AssumptionsFileSchemaType = z.infer<typeof assumptionsFileSchema>;
