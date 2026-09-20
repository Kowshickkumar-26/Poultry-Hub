import { z } from "zod";
 
export const createBatchSchema = z.object({
  initialBirds: z
     .number({ message: "Enter a number" })
    .int("Must be a whole number")
    .positive("Must be greater than 0"),
});
 
export type CreateBatchFormValues = z.infer<typeof createBatchSchema>;
 