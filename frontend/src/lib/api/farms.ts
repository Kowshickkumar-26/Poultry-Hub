import { api } from "@/lib/api";

export interface FarmResponse {
  id: number;
  name: string;
  location?: string;
  description?: string;
  ownerName?: string;
  createdAt?: string;
}

export interface FarmRequest {
  name: string;
  location?: string;
  description?: string;
}

export async function createMyFarm(data: FarmRequest): Promise<FarmResponse> {
  const response = await api.post<FarmResponse>("/api/farms/my-farm", data);
  return response.data;
}

export async function getMyFarm(): Promise<FarmResponse> {
  const response = await api.get<FarmResponse>("/api/farms/me");
  return response.data;
}

export async function updateMyFarm(data: FarmRequest): Promise<FarmResponse> {
  const response = await api.put<FarmResponse>("/api/farms/me", data);
  return response.data;
}

export async function getFarmById(id: number): Promise<FarmResponse> {
  const response = await api.get<FarmResponse>(`/api/farms/${id}`);
  return response.data;
}

export async function getAllFarms(): Promise<FarmResponse[]> {
  const response = await api.get<FarmResponse[]>("/api/farms");
  return response.data;
}
