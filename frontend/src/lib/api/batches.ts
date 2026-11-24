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
  try {
    const response = await api.get(`/api/batches/${batchId}/closing-report`, {
      responseType: "blob",
    });

    // Check if the response was actually JSON error returned with blob type
    if (response.data && (response.data as Blob).type === "application/json") {
      const text = await (response.data as Blob).text();
      let errorMsg = "Failed to generate Batch Report PDF.";
      try {
        const json = JSON.parse(text);
        errorMsg = json.message || json.error || errorMsg;
      } catch {
        // use fallback
      }
      throw new Error(errorMsg);
    }

    // Extract filename from content-disposition header if available
    let filename = batchCode ? `Batch-${batchCode}-Report.pdf` : `Batch-${batchId}-Report.pdf`;
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
  } catch (err: unknown) {
    if (err && typeof err === "object" && "response" in err) {
      const res = (err as { response?: { data?: unknown } }).response;
      if (res?.data instanceof Blob) {
        try {
          const text = await res.data.text();
          const json = JSON.parse(text);
          throw new Error(json.message || json.error || "Failed to generate Batch Report PDF.");
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message !== "Failed to generate Batch Report PDF.") {
            throw parseErr;
          }
        }
      }
    }
    throw err;
  }
}

