import { api } from "@/lib/api";
import type { FarmerResponse, FarmerProfileUpdateRequest } from "@/types/farmer";

export async function getMyFarmerProfile(): Promise<FarmerResponse> {
  const response = await api.get<FarmerResponse>("/api/farmers/me");
  return response.data;
}

export async function updateMyFarmerProfile(data: FarmerProfileUpdateRequest): Promise<FarmerResponse> {
  const response = await api.put<FarmerResponse>("/api/farmers/me", data);
  return response.data;
}

export async function getAllFarmers(): Promise<FarmerResponse[]> {
  const response = await api.get<FarmerResponse[]>("/api/farmers");
  return response.data;
}

export async function getFarmerById(id: number): Promise<FarmerResponse> {
  const response = await api.get<FarmerResponse>(`/api/farmers/${id}`);
  return response.data;
}
