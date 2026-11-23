import { api } from "@/lib/api";
import type { CeoMultiFarmReportResponse, CeoReportFilterParams } from "@/types/ceoReport";

export async function getCeoMultiFarmReport(
  params?: CeoReportFilterParams
): Promise<CeoMultiFarmReportResponse> {
  const response = await api.get<CeoMultiFarmReportResponse>("/api/ceo/reports/overview", {
    params: {
      farmId: params?.farmId,
      batchStatus: params?.batchStatus,
      startDate: params?.startDate,
      endDate: params?.endDate,
    },
  });
  return response.data;
}
