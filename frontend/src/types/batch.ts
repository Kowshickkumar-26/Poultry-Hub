import { z } from "zod";

export type BatchStatus = "ACTIVE" | "COMPLETED";

export interface BatchRequest {
  farmId: number;
  initialBirds: number;
}

export interface BatchResponse {
  id: number;
  farmId: number;
  farmName: string;
  batchCode: string;
  farmerId: number;
  farmerName: string;
  startDate: string | null;
  endDate: string | null;
  initialBirds: number;
  status: BatchStatus;
}

export const createBatchSchema = z.object({
  initialBirds: z
    .number({ message: "Enter a number" })
    .int("Must be a whole number")
    .positive("Must be greater than 0"),
});

export type CreateBatchFormValues = z.infer<typeof createBatchSchema>;
