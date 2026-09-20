import axios from "axios";
import type { CeoMultiFarmReportResponse, CeoReportFilterParams } from "@/types/ceoReport";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getCeoMultiFarmReport(
  params?: CeoReportFilterParams
): Promise<CeoMultiFarmReportResponse> {
  const response = await api.get<CeoMultiFarmReportResponse>("/ceo/reports/overview", {
    params: {
      farmId: params?.farmId,
      batchStatus: params?.batchStatus,
      startDate: params?.startDate,
      endDate: params?.endDate,
    },
  });
  return response.data;
}
