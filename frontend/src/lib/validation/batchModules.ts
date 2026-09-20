import { z } from "zod";

export const feedLoadSchema = z.object({
  loadDate: z.string().min(1, "Date is required"),
  feedType: z.string().min(1, "Feed type is required"),
  bags: z
    .number({ message: "Enter a number" })
    .positive("Must be greater than 0"),
});
export type FeedLoadFormValues = z.infer<typeof feedLoadSchema>;

export const vaccineSchema = z.object({
  givenDate: z.string().min(1, "Date is required"),
  vaccineName: z.string().min(1, "Vaccine name is required"),
  remarks: z.string().optional(),
});
export type VaccineFormValues = z.infer<typeof vaccineSchema>;

export const saleSchema = z.object({
  saleDate: z.string().min(1, "Date is required"),
  traderName: z.string().optional(),
  birdsSold: z
    .number({ message: "Enter a number" })
    .int("Must be a whole number")
    .positive("Must be greater than 0"),
  totalWeightKg: z
    .number({ message: "Enter a number" })
    .positive("Must be greater than 0"),
  ratePerKg: z
    .number({ message: "Enter a number" })
    .positive("Must be greater than 0"),
  liftingSignature: z.string().optional(),
});
export type SaleFormValues = z.infer<typeof saleSchema>;

export const expenseSchema = z.object({
  expenseDate: z.string().min(1, "Date is required"),
  category: z.enum(
    ["FEED", "MEDICINE", "LABOR", "TRANSPORT", "UTILITIES", "MISC"],
    { message: "Select a category" }
  ),
  amount: z
    .number({ message: "Enter a number" })
    .positive("Must be greater than 0"),
  description: z.string().optional(),
});
export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const remarkSchema = z.object({
  remarkDate: z.string().min(1, "Date is required"),
  note: z.string().min(1, "Note is required"),
});
export type RemarkFormValues = z.infer<typeof remarkSchema>;
