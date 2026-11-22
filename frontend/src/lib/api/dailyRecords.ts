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

export async function updateDailyRecord(
  batchId: number,
  dailyRecordId: number,
  data: DailyRecordRequest
): Promise<DailyRecordResponse> {
  const response = await api.put<DailyRecordResponse>(
    `/api/batches/${batchId}/daily-records/${dailyRecordId}`,
    data
  );

  return response.data;
}

export async function deleteDailyRecord(
  batchId: number,
  dailyRecordId: number
): Promise<void> {
  await api.delete(`/api/batches/${batchId}/daily-records/${dailyRecordId}`);
}
