import { z } from "zod";

export const dailyRecordSchema = z.object({
  recordDate: z.string().optional(),

  mortality: z
    .number({ message: "Enter number of birds died today" })
    .int("Must be a whole number")
    .min(0, "Mortality cannot be negative"),

  morningMortality: z
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .optional(),

  feedBagsConsumed: z
    .number({ message: "Enter number of feed bags" })
    .min(0, "Bags cannot be negative")
    .optional(),

  bagCapacityKg: z
    .number({ message: "Select bag capacity" })
    .positive("Bag capacity must be positive")
    .optional(),

  feedType: z.string().optional(),

  feedConsumedKg: z
    .number()
    .min(0, "Cannot be negative")
    .optional(),

  avgWeightG: z
    .number({ message: "Enter average bird weight in grams" })
    .min(0, "Weight cannot be negative")
    .optional(),

  minFeedIntakeG: z.number().min(0).optional(),
  cumulativeFeedMinKg: z.number().min(0).optional(),
  cumulativeFeedActualKg: z.number().min(0).optional(),
  minBodyWeightG: z.number().min(0).optional(),
  standardFcr: z.number().min(0).optional(),
  feedBagsTotal: z.number().min(0).optional(),
  feedBagsClosingStock: z.number().min(0).optional(),
  signature: z.string().optional(),
  notes: z.string().optional(),
});

export type DailyRecordFormValues = z.infer<typeof dailyRecordSchema>;