import { api } from "@/lib/api";
import type { UserProfile } from "@/types/auth";

export async function getCurrentUserProfile(): Promise<UserProfile> {
  const response = await api.get<UserProfile>("/api/users/me");
  return response.data;
}
