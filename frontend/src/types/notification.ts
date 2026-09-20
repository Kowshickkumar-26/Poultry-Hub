export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  category: "FEED" | "BATCH" | "DAILY_RECORD" | "SYSTEM" | string;
  severity: "INFO" | "WARNING" | "CRITICAL" | "SUCCESS" | string;
  link?: string;
  batchId?: number;
  batchCode?: string;
  read: boolean;
  createdAt: string;
}
