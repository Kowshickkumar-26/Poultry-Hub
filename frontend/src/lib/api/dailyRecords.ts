import { api } from "@/lib/api";
import type {
  DailyRecordRequest,
  DailyRecordResponse,
} from "@/types/dailyRecord";

export async function getDailyRecords(
  batchId: number
): Promise<DailyRecordResponse[]> {
  const response = await api.get<DailyRecordResponse[]>(
    `/api/batches/${batchId}/daily-records`
  );

  return response.data;
}

export async function addDailyRecord(
  batchId: number,
  data: DailyRecordRequest
): Promise<DailyRecordResponse> {
  const response = await api.post<DailyRecordResponse>(
    `/api/batches/${batchId}/daily-records`,
    data
  );

  return response.data;
}