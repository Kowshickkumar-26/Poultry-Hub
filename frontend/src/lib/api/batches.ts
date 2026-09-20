import { api } from "@/lib/api";
import type { BatchRequest, BatchResponse } from "@/types/batch";

// Every function here maps 1:1 to a backend endpoint. Components never
// call `api.get(...)` directly for batches -- they call these, so the
// URL/shape only needs to be correct in one place.

export async function createBatch(data: BatchRequest): Promise<BatchResponse> {
  const response = await api.post<BatchResponse>("/api/batches", data);
  return response.data;
}

export async function getActiveBatch(): Promise<BatchResponse | null> {
  const response = await api.get<BatchResponse | null>("/api/batches/active");
  return response.data;
}

export async function getBatchHistory(): Promise<BatchResponse[]> {
  const response = await api.get<BatchResponse[]>("/api/batches/history");
  return response.data;
}

export async function getBatchById(id: number): Promise<BatchResponse> {
  const response = await api.get<BatchResponse>(`/api/batches/${id}`);
  return response.data;
}

export async function endBatch(id: number): Promise<BatchResponse> {
  const response = await api.put<BatchResponse>(`/api/batches/${id}/end`, {});
  return response.data;
}

export async function getActiveBatches(): Promise<BatchResponse[]> {
  const response = await api.get<BatchResponse[]>("/api/batches/all-active");
  return response.data;
}

export async function getCompletedBatches(): Promise<BatchResponse[]> {
  const response = await api.get<BatchResponse[]>("/api/batches/all-completed");
  return response.data;
}

export async function downloadBatchClosingReport(batchId: number, batchCode?: string): Promise<void> {
  const response = await api.get(`/api/batches/${batchId}/closing-report`, {
    responseType: "blob",
  });

  // Extract filename from content-disposition header if available
  let filename = batchCode ? `Batch-${batchCode}-Closing-Report.pdf` : `Batch-${batchId}-Closing-Report.pdf`;
  const disposition = response.headers["content-disposition"];
  if (disposition) {
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].trim();
    }
  }

  // Trigger browser download via object URL
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

