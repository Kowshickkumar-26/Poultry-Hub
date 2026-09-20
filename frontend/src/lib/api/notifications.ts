import { api } from "@/lib/api";
import type { NotificationDto } from "@/types/notification";

export async function getNotifications(): Promise<NotificationDto[]> {
  const response = await api.get<NotificationDto[]>("/api/notifications");
  return response.data;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await api.put(`/api/notifications/${id}/read`, {});
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await api.put("/api/notifications/read-all", {});
}
