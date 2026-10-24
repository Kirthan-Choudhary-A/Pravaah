import { z } from 'zod';

export const vehicleMoveSchema = z.object({
  fromState: z.string().length(2),
  fromRTO: z.string(),
  toState: z.string().length(2),
  toRTO: z.string(),
  vehicleType: z.enum(['two-wheeler', 'car']),
  isBHSeries: z.boolean(),
  movedOnDay: z.number(),
});

export const absenceWindowSchema = z.object({
  start: z.number(),
  end: z.number(),
});

export const slotAlternativeSchema = z.object({
  rtoCode: z.string(),
  queueDays: z.number(),
  simulated: z.literal(true),
});

export const scenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  move: vehicleMoveSchema,
  licenceExpiryDay: z.number(),
  primarySlotQueue: z.number(),
  alternativeSlots: z.array(slotAlternativeSchema).optional(),
  absence: absenceWindowSchema,
  blockers: z.object({
    form35Open: z.boolean(),
    unpaidChallansCount: z.number(),
    unpaidChallansAmount: z.number(),
  }),
  timings: z.object({
    nocProcessingDays: z.number(),
    bankConsentForm28Days: z.number(),
  }),
  addressProofType: z.enum(['registered-rental-agreement', 'other']),
});

export const scenariosFileSchema = z.record(scenarioSchema);

export type ScenarioSchemaType = z.infer<typeof scenarioSchema>;
